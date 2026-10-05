# Cores, voo e proporções do universo

## Resultado
- Preservar o projeto existente, os modelos carregados e a visão de cockpit já calibrada em −90°.
- Refinar a paleta espacial: controles claros em ciano, destaques em âmbar e alertas em vermelho, com menos brilho excessivo.
- Tornar o voo arcade mais suave: curvas respondem mesmo em baixa velocidade, aceleração gradual e freios previsíveis.
- Reduzir as naves em relação aos planetas e fazer explosões, destroços, luzes e rastros acompanharem o tamanho de cada nave.

## Proporções
Usar uma referência física para naves (dezenas de metros) em comparação com a Terra. A câmera externa ficará próxima o suficiente para enxergar a nave; planetas e distâncias orbitais continuam na representação existente. Isso melhora a proporção das naves, mas não transforma o sistema inteiro numa reprodução astronômica em escala única.

## Detalhes técnicos
- A biblioteca Tween.js já está instalada: usar grupos de animação atualizados no ciclo da cena para transições suaves e envelopes de explosão, com cancelamento e limpeza.
- Centralizar as medidas usadas por modelos, cockpit, câmera, colisões e efeitos; remover offsets fixos que deixam a câmera distante quando a nave diminui.
- Ajustar movimento e amortecimento por tempo decorrido, sem depender da taxa de quadros.
- Limitar expansão e alcance luminoso das explosões ao tamanho da nave destruída.
- Manter controles, combate, gravidade e upload existentes, sem reconstruir o projeto.

## Verificação
Testar entrada no sistema solar, voo, aceleração, freio, alternância de câmera e explosões; conferir erros e imagens da cena. A calibração visual final do cockpit depende do modelo do usuário estar disponível para o teste.
