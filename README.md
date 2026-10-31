# Word Flow Reader

Aplicativo multiplataforma de leitura dinâmica RSVP, com importação de PDF e funcionamento local/offline.

## Estado atual

Migração do protótipo HTML beta em andamento. O protótipo original está preservado em `legacy/` e não deve ser alterado durante a migração.

### Funcionalidades implementadas

- Importação de PDFs com extração de texto por PDF.js.
- Leitura RSVP, uma palavra por vez, com destaque do pivô/ORP.
- Velocidade configurável de 50 a 800 palavras por minuto.
- Controles para iniciar, pausar, avançar e retroceder.
- Atalhos de teclado: espaço, seta para a esquerda e seta para a direita.
- Quatro temas: escuro, claro, sépia e papiro.
- Ajuste do tamanho da palavra.
- Índice de páginas, navegação por capítulos/seções e contexto do parágrafo.
- Indicador de progresso e contagem de palavras.
- Biblioteca local de PDFs com posições independentes por documento.
- Recuperação da última sessão e migração do formato antigo de sessão.
- Persistência local de preferências e progresso via IndexedDB.
- Pausa e salvamento da posição quando o aplicativo vai para segundo plano.

### Limitações conhecidas / trabalho pendente

- PDFs digitalizados como imagem não têm texto extraído; OCR ainda não está implementado.
- PDFs muito extensos ainda são processados integralmente em memória; a leitura incremental/por blocos pode melhorar o consumo de memória.
- O APK gerado pela automação é de depuração e não está pronto para publicação em loja.
- Ainda é necessário validar o comportamento em aparelho Android físico.
- A paridade completa com o protótipo original deve continuar sendo conferida durante a migração.

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

## Testes e build web

```bash
npm test
npm run build
npm run preview
```

## Preparar plataformas nativas

Para preparar o projeto Android pela primeira vez:

```bash
npm run android:setup
```

Nas próximas atualizações do código web:

```bash
npm run android:sync
npm run android:open
```

A preparação cria a pasta `android/` no seu computador. Ela é ignorada pelo Git neste estágio e é gerada pela automação de CI.

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

- `src/core/`: processamento de documentos, indexação e lógica de leitura.
- `src/storage/`: preferências e biblioteca local de PDFs via IndexedDB.
- `src/ui/`: interface e interação.
- `android/` e `ios/`: projetos nativos gerados localmente pelo Capacitor (ainda não versionados).
- `legacy/`: protótipo original preservado para comparação.
- `.github/workflows/`: automação de build, testes e validação Android.

## Privacidade

A direção do produto é local-first: documentos e progresso permanecem no dispositivo. Não adicionar analytics, publicidade, conta obrigatória ou envio de PDFs para servidores sem decisão explícita do proprietário do projeto.

## Regras de contribuição

1. Não remover funcionalidades existentes sem aprovação.
2. Não substituir o protótipo original.
3. Validar mudanças com `npm test` e `npm run build`.
4. Separar lógica de leitura, interface e persistência.
5. Registrar limitações conhecidas e testes realizados.
