import * as turf from '@turf/turf';
import { Coordinate, ExperimentBlock, PlantingRow, Species } from '../types';

interface ExperimentConfig {
  rowLength: number;
  rowSpacing: number; // em cm
  alleyWidth: number; // em metros
  species: Species[];
  rotationOffset?: number; // Ângulo Absoluto
  offsetX?: number; // Deslocamento X (0 a 1)
  offsetY?: number; // Deslocamento Y (0 a 1)
}

// Helper: Validação de Coordenadas
const validateCoords = (coords: any[]): Coordinate[] => {
    if (!Array.isArray(coords)) return [];
    return coords
        .map(c => {
            let lat, lng;
            if (Array.isArray(c) && c.length >= 2) { 
                lng = Number(c[0]); lat = Number(c[1]); 
            } else if (typeof c === 'object' && c !== null) { 
                lat = Number(c.latitude); lng = Number(c.longitude); 
            }
            return { latitude: lat, longitude: lng };
        })
        .filter(c => 
            typeof c.latitude === 'number' && !isNaN(c.latitude) && 
            typeof c.longitude === 'number' && !isNaN(c.longitude)
        ) as Coordinate[];
};

// Helper: Embaralhamento Fisher-Yates
const shuffleArray = <T>(array: T[]): T[] => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
};

// --- GERADOR DE CENÁRIO ÚNICO ---
export const generateSmartExperiment = (
  landCoords: Coordinate[],
  config: ExperimentConfig
): ExperimentBlock[] => {
  if (!landCoords || landCoords.length < 3) return [];
  if (!config.species || config.species.length === 0) return [];

  const coordsArray = landCoords.map(c => [c.longitude, c.latitude]);
  // Fecha o polígono se necessário
  if (coordsArray[0][0] !== coordsArray[coordsArray.length - 1][0]) {
      coordsArray.push(coordsArray[0]);
  }
  const landPoly = turf.polygon([coordsArray]);
  const pivot = turf.centroid(landPoly);

  // Dimensões
  const numRows = config.species.length;
  const rowSpacingM = config.rowSpacing / 100; 
  const blockWidthM = numRows * rowSpacingM; 
  const blockLengthM = config.rowLength;
  const alleyM = config.alleyWidth;

  // Conversão Metros -> Graus
  const centerLat = landCoords[0].latitude;
  const oneMeterInDegLat = 1 / 111132;
  const cosLat = Math.cos(centerLat * (Math.PI / 180)); 
  const oneMeterInDegLng = 1 / (111132 * (Math.abs(cosLat) < 0.0001 ? 1 : cosLat));

  const wDeg = blockWidthM * oneMeterInDegLng;
  const lDeg = blockLengthM * oneMeterInDegLat;
  const rowSpacingDeg = rowSpacingM * oneMeterInDegLng;
  const alleyDegX = alleyM * oneMeterInDegLng;
  const alleyDegY = alleyM * oneMeterInDegLat;

  const finalAngle = config.rotationOffset || 0;

  // Gira o terreno para ficar "reto"
  const rotatedLand = turf.transformRotate(landPoly, -finalAngle, { pivot: pivot });
  const bbox = turf.bbox(rotatedLand);

  // Lógica de Deslocamento (Tetris)
  const userOffsetX = (config.offsetX || 0) * (wDeg + alleyDegX);
  const userOffsetY = (config.offsetY || 0) * (lDeg + alleyDegY);

  // Expande a área de varredura para garantir cobertura com offsets
  const startX = bbox[0] - (wDeg * 2) + userOffsetX;
  const startY = bbox[1] - (lDeg * 2) + userOffsetY;
  const endX = bbox[2] + (wDeg * 2);
  const endY = bbox[3] + (lDeg * 2);

  const currentGrid: ExperimentBlock[] = [];
  let idCounter = 1;

  // Loop de Varredura
  for (let currentY = startY; currentY < endY; currentY += lDeg + alleyDegY) {
    for (let currentX = startX; currentX < endX; currentX += wDeg + alleyDegX) {

      const blockPoly = turf.bboxPolygon([currentX, currentY, currentX + wDeg, currentY + lDeg]);
      
      // Otimização: Checa sobreposição básica antes de cálculo pesado
      if (turf.booleanOverlap(blockPoly, rotatedLand) || turf.booleanContains(rotatedLand, blockPoly) || turf.booleanWithin(blockPoly, rotatedLand)) {
          
          // Verifica os 4 cantos
          const polyCoords = blockPoly.geometry.coordinates[0];
          const isCompletelyInside = polyCoords.every(coord => 
              turf.booleanPointInPolygon(turf.point(coord), rotatedLand)
          );
      
          if (isCompletelyInside) {
            const shuffledSpecies = shuffleArray(config.species);
            const internalLines: PlantingRow[] = [];

            shuffledSpecies.forEach((specie, index) => {
                const lineOffsetX = currentX + (index * rowSpacingDeg) + (rowSpacingDeg / 2);
                const lineGeo = turf.lineString([[lineOffsetX, currentY], [lineOffsetX, currentY + lDeg]]);
                
                // Gira linha de volta
                const rotatedLine = turf.transformRotate(lineGeo, finalAngle, { pivot: pivot });
                const validCoords = validateCoords(rotatedLine.geometry.coordinates);

                if (validCoords.length >= 2) {
                    internalLines.push({
                        coordinates: validCoords,
                        color: specie.color || '#FFF',
                        speciesName: specie.name
                    });
                }
            });

            // Gira bloco de volta
            const finalPoly = turf.transformRotate(blockPoly, finalAngle, { pivot: pivot });
            const validBlockCoords = validateCoords(finalPoly.geometry.coordinates[0]);

            if (validBlockCoords.length >= 3) {
                currentGrid.push({
                    id: idCounter++,
                    coordinates: validBlockCoords,
                    rotation: finalAngle,
                    rows: shuffledSpecies,
                    internalLines: internalLines,
                    isWarning: false
                });
            }
          }
      }
    }
  }
  return currentGrid;
};

// --- OTIMIZADOR INTELIGENTE ---
export const findBestExperimentConfig = (
    landCoords: Coordinate[],
    baseConfig: ExperimentConfig
): { blocks: ExperimentBlock[], bestAngle: number } => {
    
    // 1. Identificar ângulos das cercas
    const candidates = new Set<number>();
    const coords = [...landCoords];
    if (coords[0].latitude !== coords[coords.length-1].latitude) coords.push(coords[0]);

    for(let i=0; i<coords.length - 1; i++) {
        const p1 = coords[i];
        const p2 = coords[i+1];
        
        const dLon = p2.longitude - p1.longitude;
        const dLat = p2.latitude - p1.latitude;
        let theta = Math.atan2(dLon, dLat) * (180 / Math.PI);
        if (theta < 0) theta += 360;
        
        candidates.add(Math.round(theta));
        candidates.add(Math.round((theta + 90) % 360));
    }
    candidates.add(0); 

    let bestScore = -1;
    let bestAngle = 0;
    let bestBlocks: ExperimentBlock[] = [];

    // Testes de Deslocamento (0%, 33%, 66% do bloco)
    const offsetTests = [0, 0.33, 0.66];

    // 2. Simulação Combinada
    candidates.forEach(angle => {
        offsetTests.forEach(ox => {
            // Testamos deslocamento X (que em rotação afeta diagonalmente)
            const blocks = generateSmartExperiment(landCoords, { 
                ...baseConfig, 
                rotationOffset: angle,
                offsetX: ox,
                offsetY: ox 
            });
            
            // Score = Número de blocos válidos
            const score = blocks.length;

            if (score > bestScore) {
                bestScore = score;
                bestAngle = angle;
                bestBlocks = blocks;
            }
        });
    });

    // Pente Fino no Y com o melhor ângulo
    if (bestAngle !== 0) {
        offsetTests.forEach(oy => {
             const blocks = generateSmartExperiment(landCoords, { 
                ...baseConfig, 
                rotationOffset: bestAngle,
                offsetX: 0,
                offsetY: oy
            });
            if (blocks.length > bestScore) {
                bestScore = blocks.length;
                bestBlocks = blocks;
            }
        });
    }

    return { blocks: bestBlocks, bestAngle };
};