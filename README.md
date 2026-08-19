# Site Institucional — INETRIS

Site público do **INETRIS Instituto**, desenvolvido em HTML, CSS e JavaScript puro (sem frameworks, sem build), pronto para publicação no GitHub Pages e preparado para receber novos módulos no futuro.

## 📁 Estrutura do projeto

```
inetris-site/
├── index.html          → estrutura e conteúdo de todas as seções
├── css/
│   └── style.css        → todo o visual do site (cores, tipografia, layout, responsivo)
├── js/
│   └── script.js         → menu mobile, animações de scroll, contadores
├── assets/
│   ├── logo.png          → logotipo do INETRIS (substitua pelo arquivo oficial)
│   └── mentorias/         → pasta reservada para fotos reais das mentorias
└── README.md
```

## ✏️ Como editar o conteúdo

Todo o texto do site fica direto no `index.html`, organizado em seções comentadas (`<!-- ===== NOME DA SEÇÃO ===== -->`). Para editar:

1. Abra `index.html` em qualquer editor de texto.
2. Localize a seção pelo comentário ou pelo `id` (ex.: `id="quem-somos"`).
3. Edite o texto entre as tags HTML — não é necessário mexer no CSS ou no JS para trocar textos.

### Seções e onde encontrá-las

| Seção                  | `id` no HTML     |
|-------------------------|------------------|
| Início / Hero            | `#topo`          |
| Quem Somos                | `#quem-somos`    |
| Problemas que resolvemos    | `#problemas`     |
| Nossas Soluções            | `#solucoes`      |
| Formação de Líderes         | `#formacao`      |
| Mentoria Empresarial         | `#mentoria`      |
| Consultoria de Gestão        | `#consultoria`   |
| Resultados / Autoridade      | `#resultados`    |
| Galeria / Mentorias           | `#galeria`       |
| Fale Conosco                  | `#contato`       |

### Logo e marca d'água

A pasta `assets/` já contém a logo oficial do INETRIS, extraída com fundo transparente:

- `assets/logo.png` — logo principal (símbolo branco e dourado, fundo transparente). Usada no cabeçalho e no rodapé.
- `assets/logo-watermark.png` — versão da logo em branco com opacidade bem baixa, pensada para uso como marca d'água sobre fundos azuis (usada no Hero e no rodapé).
- `assets/logo-watermark-navy.png` — versão da logo em azul com opacidade bem baixa, pensada para uso como marca d'água sobre fundos claros (usada nas seções "Quem Somos" e "Fale Conosco").

Para trocar a logo no futuro, basta substituir `assets/logo.png` por um arquivo com fundo transparente e gerar novamente as versões de marca d'água (qualquer editor de imagem serve: duplique a camada, pinte de branco ou azul e reduza a opacidade para cerca de 10-15%).

Para ajustar o tamanho ou a posição da marca d'água em cada seção, procure por `logo-watermark` no `css/style.css` — as propriedades `background-size` e `background-position` controlam isso.

### Trocar os números de Resultados/Autoridade

No `index.html`, dentro da seção `#resultados`, cada número fica em:

```html
<span class="stat-number" data-count="120">0</span>
```

Basta alterar o valor de `data-count` para o número desejado. O site anima a contagem automaticamente.

### Trocar as fotos da Galeria

Na seção `#galeria`, cada item da galeria é um bloco `.gallery-card`. A galeria já está com 6 fotos reais das mentorias/formações do INETRIS, salvas em `assets/mentorias/`. Para trocar ou adicionar novas fotos:

1. Coloque o novo arquivo de foto dentro de `assets/mentorias/` (ex.: `assets/mentorias/mentoria-07.jpg`).
2. No HTML, troque a URL da foto antiga pelo caminho do novo arquivo, por exemplo:

```html
<div class="gallery-img" style="background-image:url('assets/mentorias/mentoria-07.jpg')"></div>
```

3. Atualize também o título, a descrição e o tipo/data em `<figcaption>`.

Cada `.gallery-img` pode receber um `background-position` próprio (ex.: `center 20%`) para controlar qual parte da foto fica visível no card, já que o recorte é automático (`background-size: cover`). Isso é útil quando a foto é vertical (retrato) e o card é horizontal — ajuste a porcentagem para manter o rosto ou o ponto principal da foto visível.

A estrutura já está pronta para qualquer quantidade de itens — basta copiar um bloco `<figure class="gallery-card">...</figure>` inteiro para adicionar mais fotos.

### Trocar links de contato

Os links de WhatsApp, Instagram, YouTube e e-mail aparecem em três lugares: no cabeçalho, na seção **Fale Conosco** e no rodapé. Procure por `https://w.app/...`, `instagram.com`, `youtube.com` e `mailto:` no `index.html` e substitua pelos links corretos.

## 🎨 Personalizar cores e estilo

Todas as cores e principais variáveis visuais ficam centralizadas no topo do arquivo `css/style.css`, dentro de `:root`:

```css
:root {
  --azul-principal: #0a2647;
  --laranja: #e99610;
  --branco: #ffffff;
  --cinza-claro: #f5f7fa;
  ...
}
```

Alterar uma variável aqui muda a cor em todo o site automaticamente.

## 📱 Responsividade

O site é totalmente responsivo, com pontos de quebra para desktop, tablet (`≤1024px`) e celular (`≤860px` e `≤640px`), incluindo um menu de navegação que vira um menu hambúrguer em telas pequenas.

## 🚀 Publicar no GitHub Pages

1. Suba os arquivos deste projeto para a raiz do repositório (ou para a branch/pasta usada pelo GitHub Pages).
2. Em **Settings → Pages**, selecione a branch e a pasta corretas.
3. O site ficará disponível em `https://<usuario>.github.io/<repositorio>/`.

---

## 🧩 Próximos módulos (preparação para o futuro)

Este projeto foi propositalmente construído **apenas como site público institucional**, mas já com a estrutura pensada para ser a base do ecossistema digital completo do INETRIS. Nenhum dos itens abaixo está implementado nesta etapa — ficam apenas reservados/comentados no código para facilitar a expansão futura:

- **CRM interno** (`/crm`) — gestão de leads, mentorias e clientes.
- **Sistema de RH** (`/sistema-rh`) — gestão de colaboradores e processos internos.
- **Galeria completa de mentorias** (`/galeria`) — versão expandida da seção atual, com filtros e paginação.
- **Área de login / painel administrativo** (`/login`) — acesso restrito para a equipe interna.
- **Integração com Supabase** — banco de dados para alimentar CRM, RH, login e galeria dinamicamente.

### Onde estão os pontos de extensão no código

- No `<head>` de `index.html`, um bloco de comentário documenta as rotas futuras (`/crm`, `/sistema-rh`, `/galeria`, `/login`).
- No menu principal (`<nav class="main-nav">`), há um link de **Entrar** comentado, pronto para ser ativado quando o módulo de login existir.
- No rodapé (`<footer>`), há uma coluna **Área Interna** comentada, pronta para os links de CRM e RH.
- Na seção de Galeria, há um botão **Ver galeria completa** comentado, apontando para `/galeria`.

### Como ativar um módulo futuro (passo a passo geral)

1. Crie a página/aplicação correspondente (ex.: `crm/index.html` ou uma aplicação separada).
2. No `index.html` do site público, remova os comentários (`<!-- -->`) ao redor do link correspondente.
3. Ajuste o `href` para o caminho real da nova página/aplicação.
4. Se o módulo precisar de dados dinâmicos (CRM, RH, login), conecte-o a um banco de dados (ex.: Supabase) separadamente — o site público continuará funcionando de forma independente, como um site estático.

Essa separação garante que o site institucional continue leve, rápido e estável, mesmo depois que os módulos internos forem adicionados.
