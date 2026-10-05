# Faz as Contas

Site de simuladores financeiros gratuitos, gerado com Python e publicado de graça no GitHub Pages.

Simuladores prontos:

- **Vale a pena rodar de aplicativo?** Lucro real por hora e por mês, com carro próprio ou alugado.
- **Alugar ou financiar um imóvel?** Patrimônio de cada caminho ano a ano, SAC ou Price.
- **Quanto cada aparelho pesa na conta de luz?** Gasto por aparelho com a tarifa da conta.

Todos os cálculos rodam no navegador do visitante. Não há servidor, banco de dados nem custo de hospedagem.

---

## Como o projeto está organizado

```
faz-as-contas/
├── site.json                 ← nome do site, endereço, AdSense e lista de simuladores
├── build.py                  ← gera o site pronto na pasta dist/
├── templates/                ← páginas HTML (Jinja2)
│   ├── base.html             ← topo, rodapé e <head> de todas as páginas
│   ├── sim_layout.html       ← estrutura comum dos simuladores (FAQ, anúncios, relacionados)
│   ├── index.html            ← página inicial
│   ├── sims/                 ← um arquivo por simulador (formulário + texto explicativo)
│   └── paginas/              ← sobre, privacidade, 404
├── static/
│   ├── css/estilo.css        ← todo o visual (cores no topo do arquivo)
│   └── js/
│       ├── comum.js          ← formatação em reais, gráficos, link compartilhável
│       ├── calc/             ← as FÓRMULAS de cada simulador (funções puras, testadas)
│       └── pages/            ← liga as fórmulas aos campos de cada página
├── tests/                    ← testes das fórmulas
└── .github/workflows/        ← publicação automática no GitHub Pages
```

A regra principal: **fórmula fica em `static/js/calc/`, tela fica em `static/js/pages/`.** Assim você testa as contas sem abrir o navegador.

---

## Rodar no seu computador

Precisa de Python 3.10 ou mais novo.

```bash
pip install -r requirements.txt
python build.py --servir
```

Abra http://localhost:8000. Depois de mudar qualquer arquivo, rode o comando de novo.

Para testar as fórmulas (precisa do Node.js 20 ou mais novo):

```bash
node --test tests/*.test.js
```

---

## Publicar no GitHub Pages (passo a passo)

1. Crie um repositório público no GitHub chamado `faz-as-contas` (ou o nome que quiser).
2. No arquivo `site.json`, troque `SEU-USUARIO` pelo seu usuário do GitHub em `url_base`. Se o repositório tiver outro nome, troque também o final do endereço.
3. Envie os arquivos:
   ```bash
   git init
   git add .
   git commit -m "Primeira versão do site"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/faz-as-contas.git
   git push -u origin main
   ```
4. No GitHub, abra o repositório e vá em **Settings → Pages**. Em **Build and deployment → Source**, escolha **GitHub Actions**.
5. Abra a aba **Actions** e espere o processo "Publicar site" ficar verde (1 a 2 minutos).
6. O site estará em `https://SEU-USUARIO.github.io/faz-as-contas/`.

A partir daí, todo `git push` na branch `main` testa as fórmulas, gera o site e publica sozinho. Se um teste falhar, a publicação é cancelada e o site no ar continua o anterior.

---

## Domínio próprio (recomendado antes do AdSense)

O AdSense exige o arquivo `ads.txt` na raiz do domínio, o que não funciona em `github.io/faz-as-contas`. Por isso, antes de pedir aprovação:

1. Registre um domínio `.com.br` no registro.br (cerca de R$ 40 por ano).
2. No `site.json`, preencha `"dominio_proprio": "www.seudominio.com.br"`. O `build.py` cria o arquivo `CNAME` sozinho.
3. No registro.br, crie um registro **CNAME** de `www` apontando para `SEU-USUARIO.github.io`.
4. Em **Settings → Pages → Custom domain**, digite o domínio e marque **Enforce HTTPS** quando liberar.

## Anúncios e estatísticas

- **Google Analytics:** crie uma propriedade em analytics.google.com e coloque o ID (`G-XXXXXXX`) em `google_analytics_id`.
- **AdSense:** depois de aprovado, coloque o ID do editor (`ca-pub-XXXXXXXXXXXXXXXX`) em `adsense_client`. Os espaços de anúncio e o `ads.txt` aparecem sozinhos. Enquanto o campo estiver vazio, nenhum anúncio é carregado.

O AdSense costuma recusar sites muito novos ou com pouco conteúdo. Antes de pedir, tenha pelo menos 6 a 10 simuladores com texto explicativo próprio e algumas semanas de visitas.

## Fazer o Google encontrar o site

1. Cadastre o site no **Google Search Console** (search.google.com/search-console).
2. Envie o sitemap: `https://seu-endereco/sitemap.xml`.
3. Faça o mesmo no **Bing Webmaster Tools**, que também traz visitas para calculadoras.

---

## Adicionar um novo simulador

Exemplo: "CLT ou PJ".

1. **Fórmula:** crie `static/js/calc/clt-pj.js` com uma função que recebe números e devolve números.
2. **Teste:** acrescente um teste em `tests/calculos.test.js` com uma conta que você conferiu à mão.
3. **Tela:** copie um arquivo de `templates/sims/` com o nome `clt-ou-pj.html` (o nome precisa ser igual ao `slug`). Use a macro `campo(...)` para os campos.
4. **Ligação:** crie `static/js/pages/clt-pj.js`, seguindo `motorista.js` como modelo.
5. **Cadastro:** em `site.json`, mude o simulador para `"status": "ativo"` e preencha `titulo_seo`, `descricao` e o `faq`.
6. Rode `python build.py --servir` e confira.

### Ideias já listadas como "em preparação"

- Financiar o carro ou entrar num consórcio
- Em quanto tempo a energia solar se paga (bom para afiliados e venda de contatos para instaladores)
- CLT ou PJ: qual proposta paga mais
- Antecipar parcelas ou investir o dinheiro

## Manutenção periódica

- **Todo início de ano:** atualize `salario_minimo` e `atualizado_em` em `site.json`.
- **Valores de exemplo:** revise de vez em quando os valores preenchidos nos campos (preço do combustível, juros, aluguel) para continuarem realistas.
- **Textos:** cada página explica a conta e o que fica de fora. Mantenha isso honesto e específico: é o que diferencia o site de páginas geradas em massa, que o Google penaliza.
