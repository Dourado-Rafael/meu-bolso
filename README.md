# Meu Bolso 💰

Gerenciador financeiro pessoal multiplataforma (Android + iOS), feito com
Expo React Native (SDK 57) + Expo Router.

## Funcionalidades

- **Início** — resumo do mês: receitas, despesas, saldo, progresso do teto
  mensal e total a receber de devedores.
- **Lançamentos** — registro manual de receitas e despesas, com categoria,
  descrição e data. Sem conexão com banco.
- **Quem me deve** — cadastro de dívidas por pessoa: nome, valor, o que foi,
  data e previsão de pagamento. Dá para quitar itens ou tudo de uma vez e
  ver o histórico de valores recebidos.
- **Teto mensal** — limite de gastos do mês (e por categoria, opcional).
  Ao lançar uma despesa, o app avisa quando bater 80% ou 100% do limite.

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
      devedores.js      # Quem me deve
      teto.js           # Teto mensal
  components/ui.js      # componentes visuais reutilizáveis
  lib/
    theme.js            # cores
    format.js           # moeda, datas, ids
    categories.js       # categorias de receita/despesa
    storage.js          # persistência (AsyncStorage)
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
