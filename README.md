# Word Flow Reader

Aplicativo multiplataforma de leitura dinâmica RSVP, com importação de PDF e funcionamento offline.

## Estado do projeto

**Fundação técnica inicial (0.1.0).** Esta estrutura é o ponto de partida da migração do protótipo HTML beta. O arquivo original está preservado em `legacy/` e não deve ser alterado durante a migração.

### Funcionalidades já presentes nesta fundação
- Importação de PDF e extração de texto com PDF.js.
- Leitura RSVP, uma palavra por vez.
- Velocidade configurável de 50 a 800 palavras por minuto.
- Avançar e retroceder palavra.
- Quatro temas: escuro, claro, sépia e papiro.
- Ajuste de tamanho da palavra.
- Preferências persistidas localmente.

### Funcionalidades a migrar e validar contra o protótipo
- Destaque do pivô/ORP em vermelho.
- Segmentação e navegação por capítulos.
- Contexto do parágrafo e navegação por página.
- Marcadores e retomada exata da leitura.
- Estatísticas completas, tempo decorrido e progresso.
- Modo foco e navegação mobile entre leitura/detalhes.
- Biblioteca local de documentos e persistência robusta via IndexedDB.
- Tratamento de PDFs digitalizados, incluindo avaliação de OCR.

## Requisitos

- Node.js 22 ou superior.
- npm.
- Android Studio para compilar Android.
- macOS com Xcode para compilar e assinar iOS.

## Desenvolvimento

```bash
npm install
npm run dev
```

## Build web

```bash
npm run build
npm run preview
```

## Preparar plataformas nativas

```bash
npm run android:add
npm run cap:sync
```

Para iOS, em macOS:

```bash
npm run ios:add
npm run cap:sync
```

## Identidade nativa

- App ID inicial: `br.com.maxrocha.wordflowreader`
- Nome: `Word Flow Reader`

Confirme/ajuste o identificador antes de publicar nas lojas. Ele deve ser único e definitivo.

## Arquitetura

- `src/core/`: processamento de documentos e lógica de leitura.
- `src/storage/`: preferências e, na próxima etapa, IndexedDB.
- `src/ui/`: interface e interação.
- `legacy/`: protótipo original preservado para comparação.
- `.github/workflows/`: automação de build e validação.

## Privacidade

A direção do produto é local-first: documentos e progresso permanecem no dispositivo. Não adicionar analytics, publicidade, conta obrigatória ou envio de PDFs para servidores sem decisão explícita do proprietário do projeto.

## Regras de contribuição

1. Não remover funcionalidades existentes sem aprovação.
2. Não substituir o protótipo original.
3. Validar mudanças com `npm run build`.
4. Separar lógica de leitura, interface e persistência.
5. Registrar limitações conhecidas e testes realizados.
