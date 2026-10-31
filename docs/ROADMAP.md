# Roadmap de migração

## Fase 0 — Fundação
- [x] Estrutura Vite + TypeScript + Capacitor.
- [x] Importação de PDF e leitura RSVP básica.
- [x] Preferências locais de tema, tamanho e velocidade.
- [x] Preservar protótipo em `legacy/`.

## Fase 1 — Paridade com o protótipo
- [ ] Auditar e mapear cada função do HTML original.
- [ ] Implementar pivô/ORP e regras de pontuação.
- [ ] Recriar detecção de capítulos e navegação.
- [ ] Recriar contexto do parágrafo.
- [ ] Recriar marcador com retomada exata.
- [ ] Recriar estatísticas, tempo e progresso.
- [ ] Recriar modo foco e navegação mobile.
- [ ] Testar PDFs curtos, longos, com acentos e múltiplas colunas.

## Fase 2 — Aplicativo robusto
- [ ] Biblioteca de documentos.
- [ ] IndexedDB para documentos/metadados/progresso.
- [ ] Migrações de dados e recuperação após fechamento inesperado.
- [ ] Acessibilidade, teclado, leitores de tela e preferências do sistema.
- [ ] Testes unitários e testes de interface.

## Fase 3 — Integração nativa
- [ ] Android: seletor de arquivos, ciclo de vida e permissões.
- [ ] iOS: seletor de arquivos e ciclo de vida.
- [ ] Ícones, splash screen, orientação e safe areas.
- [ ] Testes em aparelhos reais.

## Fase 4 — Publicação
- [ ] Política de privacidade e página de suporte.
- [ ] Metadados, capturas de tela e descrição das lojas.
- [ ] Assinatura Android AAB.
- [ ] Assinatura iOS e TestFlight.
- [ ] Revisão de requisitos vigentes das lojas.
