# Pede Aqui

Cardápio digital e pedidos para restaurantes, em português (Brasil). Cada restaurante tem seu próprio painel, cardápio público e pedidos, isolados dos demais.

> A solicitação de acesso é feita em um site separado, mantido pela equipe. Este projeto **não** exibe formulário público de cadastro — apenas consome as contas criadas por aquele site através da API.

## Telas

| Endereço | O que é |
| --- | --- |
| `/` | Página inicial do Pede Aqui |
| `/entrar` | Login (dono ou administrador da plataforma) |
| `/painel` | Painel do dono: pratos, preços, disponibilidade, categorias, mesas/QR Code e pedidos |
| `/admin` | Administração da plataforma: aprovar ou recusar restaurantes |
| `/cardapio/:slug` | Site público do restaurante (aberto pelo QR Code) |

`/cadastro` redireciona para a página inicial — não há formulário de solicitação aqui.

## Fluxo

1. O site de cadastro da equipe cria a conta do dono (integração via `POST /api/auth/register`).
2. A conta fica pendente. O dono já pode entrar, mas vê uma tela "aguardando aprovação".
3. O administrador entra em `/admin` e aprova (ou recusa) o restaurante.
4. Aprovado, o dono acessa `/painel`, monta o cardápio e gera o QR Code.
5. O cliente escaneia o QR, monta o pedido e o dono o recebe no painel (atualização automática a cada 5s).

Os preços dos pedidos são sempre recalculados no servidor com base no cardápio atual, e cada restaurante só acessa seus próprios pratos e pedidos.

### Cardápio

- **Categorias**: crie, renomeie, reordene (↑/↓) e exclua categorias no painel. Renomear uma categoria atualiza todos os pratos dela; excluir move os pratos para "Geral".
- **Fotos**: ao adicionar ou editar um prato, escolha uma imagem. Ela é redimensionada no navegador (máx. 900 px, JPEG) e salva no banco como data URL — sem precisar de servidor de arquivos.
- A ordem das categorias no site público segue a ordem definida no painel.

### Mesas

- No painel, cadastre mesas pelo número ou nome (ex.: `1`, `A2`, `Balcão`).
- Cada mesa gera um QR Code próprio apontando para `/cardapio/:slug?mesa=N`.
- Use **Imprimir todos** para imprimir os QRs das mesas.
- Quando o cliente pede por um QR de mesa, o pedido chega ao dono com o número da mesa destacado.
- O QR geral do restaurante (sem mesa) continua funcionando normalmente.

### Histórico e relatórios

- A lista de pedidos pode ser filtrada por status (Todos / Novos / Preparando / Concluídos) e por período (De / Até).
- O painel de **Relatórios** mostra faturamento, quantidade de pedidos e ticket médio dos últimos 7, 30 ou 90 dias.
- Inclui um gráfico de faturamento por dia e o ranking dos 5 pratos mais vendidos.
- Os filtros também estão disponíveis na API: `GET /api/me/orders?status=done&from=2026-01-01&to=2026-01-31`.

## Como rodar

```bash
cd ~/Projects/menu-app
npm run dev
```

Isso inicia a API (`localhost:3000`) e o site (`localhost:5173`). Use o endereço de rede mostrado pelo Vite (por exemplo `http://192.168.178.129:5173/admin`) no aparelho do dono para que o QR Code aponte para um endereço que o celular consiga acessar.

### Criar o administrador da plataforma

```bash
cd ~/Projects/menu-app
npm run create-admin -- voce@exemplo.com sua-senha-forte "Seu Nome"
```

A senha precisa ter pelo menos 8 caracteres. É uma conta só sua, com role `platform_admin`.

### Produção

```bash
npm run build
npm start
```

O mesmo servidor Express serve o site compilado e a API na porta 3000 (altere com `PORT`).

### Versão demonstrativa (estática)

GitHub Pages e Vercel não executam o banco SQLite, então esses ambientes usam um modo demo com dados de exemplo salvos no `localStorage` do navegador:

```bash
npm run build:pages   # base /pede-aqui/ para GitHub Pages
VITE_DEMO=true npm run build   # base / para Vercel
```

Contas da demo: `dono@pedeaqui.com` / `senha12345` (dono) e `admin@pedeaqui.com` / `admin12345` (admin). Cardápio público de exemplo: `/cardapio/cafe-da-ana`.

## Banco de dados

SQLite em `data/menu.db`, criado automaticamente. Guarda usuários, sessões, restaurantes, pratos e pedidos. Senhas são armazenadas com hash scrypt; sessões usam cookie `HttpOnly`.

## Scripts

- `npm run dev` — API + Vite juntos
- `npm run build` — checagem de tipos e build de produção
- `npm run build:pages` — build estático demo para GitHub Pages
- `npm start` — servidor de produção
- `npm run create-admin -- <email> <senha> [nome]` — cria administrador da plataforma
