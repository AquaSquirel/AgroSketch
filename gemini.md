# Contexto do Projeto: AgroSketch Pro (AgroTech)

Este arquivo contém informações essenciais para o assistente de IA (Gemini) sobre o projeto AgroSketch Pro.

## 1. Visão Geral
**AgroSketch Pro** é uma aplicação móvel desenvolvida para engenheiros agrônomos e produtores rurais. O objetivo principal é oferecer ferramentas para mapeamento rural, medição de áreas via satélite e planejamento de plantio, substituindo métodos manuais por uma solução digital baseada em geolocalização.

## 2. Stack Tecnológica
*   **Framework:** React Native com Expo (SDK 54)
*   **Linguagem:** TypeScript
*   **Roteamento:** `expo-router`
*   **Mapas:** `react-native-maps` (Google Maps API)
*   **Cálculos Geoespaciais:** `@turf/turf`
*   **Persistência de Dados:** `@react-native-async-storage/async-storage` (Offline first)
*   **PDF e Compartilhamento:** `expo-print`, `expo-sharing`, `react-native-view-shot`
*   **Estilização:** Estilos inline ou `StyleSheet` do React Native (verificar padrão nos arquivos).

## 3. Estrutura do Projeto
A estrutura de pastas segue o padrão do Expo Router:

*   `app/`: Contém as rotas da aplicação (file-based routing).
    *   `_layout.tsx`: Layout raiz e configurações de navegação.
    *   `index.tsx`: Tela inicial.
    *   `map.tsx`: Tela de mapa (provavelmente utiliza `MapEditor`).
    *   `calculator.tsx`: Tela da calculadora agrícola.
    *   `list.tsx`: Tela de listagem de projetos salvos.
    *   `experiment.tsx`: Tela de experimento (nova funcionalidade).
*   `src/`: Código fonte reutilizável e lógica de negócio.
    *   `components/`: Componentes de UI reutilizáveis (se houver).
    *   `screens/`: Implementação das telas (separação de view/logic das rotas).
        *   `Home.tsx`, `MapEditor.tsx`, `Calculator.tsx`, `SavedList.tsx`, `ExperimentSetupScreen.tsx`.
    *   `context/`: Gerenciamento de estado global (ex: `LandsContext.tsx`).
    *   `utils/`: Funções utilitárias e lógica de negócios pura (ex: `experimentLogic.ts`).
    *   `types.ts`: Definições de tipos TypeScript globais.
*   `assets/`: Imagens e ícones.

## 4. Funcionalidades Chave
1.  **Mapeamento:** Desenho de polígonos sobre mapas de satélite.
2.  **Cálculos:** Área (ha, m²) e perímetro automáticos.
3.  **Calculadora Agrícola:** Estimativa de insumos e estande de plantas.
4.  **Gestão de Projetos:** Salvar/Carregar/Editar mapeamentos localmente.
5.  **Exportação:** Gerar relatórios em PDF com imagem do mapa.
6.  **Experimentação:** (Em desenvolvimento) Funcionalidades relacionadas a experimentos agrícolas.

## 5. Diretrizes para o Assistente
*   **Convenções:** Seguir estritamente o uso de TypeScript. Garantir tipagem correta.
*   **Estilo:** Manter consistência com o código existente (verificar se usa `StyleSheet` ou bibliotecas de estilo).
*   **Bibliotecas:** Utilizar as bibliotecas já instaladas (`package.json`). Evitar adicionar novas dependências sem necessidade extrema.
*   **Navegação:** Respeitar a estrutura do `expo-router` ao criar ou modificar rotas.
*   **Segurança:** Não expor chaves de API no código (embora seja um app mobile, boas práticas são essenciais).

## 6. Comandos Úteis
*   `npm start` ou `npx expo start`: Iniciar o servidor de desenvolvimento.
*   `npm run android` / `npm run ios`: Rodar em emuladores/dispositivos.

---
*Gerado automaticamente para contexto do Gemini.*
