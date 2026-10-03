# Meu Bolso 💰

Gerenciador financeiro pessoal multiplataforma (Android + iOS), feito com
Expo React Native (SDK 57) + Expo Router.

## Funcionalidades

- **Início** — resumo do mês: receitas, despesas, saldo, gráfico de gastos
  por categoria e painel "Tetos por categoria" com barras de progresso e
  alertas de 80%/100%.
- **Lançamentos** — registro manual de receitas e despesas, com categoria,
  descrição e data. Busca por descrição/categoria e edição de lançamentos.
  Sem conexão com banco.
- **Recorrentes** — contas fixas mensais (valor fixo que se repete todo mês).
  As parcelas aparecem automaticamente nos Lançamentos com selo "Recorrente".
- **Quem me deve** — cadastro de dívidas por pessoa: nome, valor, o que foi,
  data e previsão de pagamento. Dá para quitar itens ou tudo de uma vez e
  ver o histórico de valores recebidos.
- **Teto** — teto por categoria como protagonista (limites individuais com
  alertas de 80%/100%) + teto geral do mês opcional. Ao lançar uma despesa,
  o app avisa quando bater nos limites.
- **Ajustes** — backup e restauração: gera um arquivo `.json` com todos os
  dados (compartilha via Drive/WhatsApp/e-mail) e restaura a partir dele.

Os dados ficam salvos no próprio aparelho (AsyncStorage).

## Estrutura

```
src/
  app/
    _layout.js          # layout raiz (Stack)
    (tabs)/
      _layout.js        # abas inferiores
      index.js          # Início
      lancamentos.js    # Lançamentos
      recorrentes.js    # Recorrentes
      devedores.js      # Quem me deve
      teto.js           # Teto (por categoria + geral)
      ajustes.js        # Ajustes (backup/restauração)
  components/ui.js      # componentes visuais reutilizáveis
  lib/
    theme.js            # cores
    format.js           # moeda, datas, ids
    categories.js       # categorias de receita/despesa
    storage.js          # persistência (AsyncStorage)
    recurring.js        # expansão das contas recorrentes
    backup.js           # exportação/importação de backup
```

## Como rodar

Pré-requisitos: Node 18+ e o app **Expo Go** instalado no celular
(disponível na Play Store e na App Store).

```bash
cd meu-bolso
npm install
npx expo start
```

Escaneie o QR code com o Expo Go (Android) ou com a câmera (iOS).

## Gerar o app das lojas

Com o projeto rodando, o caminho recomendado é o EAS (build na nuvem,
sem precisar de Mac ou Android Studio):

```bash
npx eas-cli@latest build --platform android   # gera o .aab/.apk
npx eas-cli@latest build --platform ios       # gera o .ipa
```

É preciso criar uma conta gratuita em https://expo.dev.
