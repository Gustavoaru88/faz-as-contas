"""Gera o site estático em dist/.

Uso:
    python build.py            # gera o site em dist/
    python build.py --servir   # gera e abre um servidor local em http://localhost:8000
"""

import hashlib
import json
import re
import shutil
import sys
from datetime import date
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

RAIZ = Path(__file__).parent
SAIDA = RAIZ / "dist"

# Cor do ícone de cada categoria (classes definidas em estilo.css).
# Ao criar uma categoria nova, acrescente aqui; sem isso ela fica verde.
CORES_CATEGORIA = {
    "Trabalho e renda": "azul",
    "Moradia": "verde",
    "Casa": "ambar",
    "Veículos": "violeta",
    "Dívidas": "rosa",
}


def carregar_config():
    config = json.loads((RAIZ / "site.json").read_text(encoding="utf-8"))
    if config.get("dominio_proprio"):
        config["url_base"] = "https://" + config["dominio_proprio"].strip("/")
    config["url_base"] = config["url_base"].rstrip("/")
    return config


def formatar_data(iso):
    meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho",
             "agosto", "setembro", "outubro", "novembro", "dezembro"]
    d = date.fromisoformat(iso)
    return f"{d.day} de {meses[d.month - 1]} de {d.year}"


def versao_arquivos():
    h = hashlib.sha1()
    for arq in sorted((RAIZ / "static").rglob("*")):
        if arq.is_file():
            h.update(arq.relative_to(RAIZ).as_posix().encode())
            h.update(arq.read_bytes())
    return h.hexdigest()[:10]


def marcar_versao_nos_imports(pasta_js, versao):
    """Acrescenta ?v=versao aos imports entre os arquivos JS (ex.: "../comum.js")."""
    padrao = re.compile(r'(from\s+["\'])(\.{1,2}/[^"\']+?\.js)(["\'])')
    for arq in pasta_js.rglob("*.js"):
        texto = arq.read_text(encoding="utf-8")
        novo = padrao.sub(lambda m: f"{m.group(1)}{m.group(2)}?v={versao}{m.group(3)}", texto)
        if novo != texto:
            arq.write_text(novo, encoding="utf-8")


def dados_estruturados(sim, config):
    """JSON-LD (schema.org) que ajuda o Google a entender a página e exibir o FAQ."""
    url = f"{config['url_base']}/{sim['slug']}/"
    grafo = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebApplication",
                "name": sim["titulo_seo"],
                "description": sim["descricao"],
                "url": url,
                "applicationCategory": "FinanceApplication",
                "operatingSystem": "Qualquer navegador",
                "inLanguage": "pt-BR",
                "offers": {"@type": "Offer", "price": "0", "priceCurrency": "BRL"},
            },
            {
                "@type": "FAQPage",
                "mainEntity": [
                    {"@type": "Question", "name": f["p"],
                     "acceptedAnswer": {"@type": "Answer", "text": f["r"]}}
                    for f in sim.get("faq", [])
                ],
            },
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": config["nome"],
                     "item": config["url_base"] + "/"},
                    {"@type": "ListItem", "position": 2, "name": sim["pergunta"], "item": url},
                ],
            },
        ],
    }
    return json.dumps(grafo, ensure_ascii=False, indent=2).replace("</", "<\\/")


def main():
    config = carregar_config()
    env = Environment(
        loader=FileSystemLoader(RAIZ / "templates"),
        autoescape=select_autoescape(["html", "xml"]),
        trim_blocks=True,
        lstrip_blocks=True,
    )
    env.filters["data_br"] = formatar_data

    if SAIDA.exists():
        shutil.rmtree(SAIDA)
    SAIDA.mkdir()
    shutil.copytree(RAIZ / "static", SAIDA / "static")

    # Versão dos arquivos: muda sempre que algo em static/ muda. Vai no fim dos
    # endereços (estilo.css?v=...) para o navegador nunca misturar versão nova e antiga.
    versao = versao_arquivos()
    env.globals["versao"] = versao
    marcar_versao_nos_imports(SAIDA / "static" / "js", versao)

    for s in config["simuladores"]:
        s["cor"] = CORES_CATEGORIA.get(s["categoria"], "verde")
    ativos = [s for s in config["simuladores"] if s["status"] == "ativo"]
    em_breve = [s for s in config["simuladores"] if s["status"] != "ativo"]
    categorias = []
    for s in config["simuladores"]:
        if s["categoria"] not in categorias:
            categorias.append(s["categoria"])
    env.globals["categorias"] = categorias
    paginas = []  # (caminho relativo, prioridade) para o sitemap

    def render(template, destino, **contexto):
        """destino: caminho da pasta, '' para a raiz. Gera destino/index.html."""
        profundidade = len([p for p in destino.split("/") if p])
        raiz_rel = "../" * profundidade or "./"
        html = env.get_template(template).render(
            site=config, raiz=raiz_rel, caminho=destino, ativos=ativos,
            em_breve=em_breve, **contexto)
        pasta = SAIDA / destino
        pasta.mkdir(parents=True, exist_ok=True)
        (pasta / "index.html").write_text(html, encoding="utf-8")

    render("index.html", "")
    paginas.append(("", "1.0"))

    for sim in ativos:
        outros = [s for s in ativos if s["slug"] != sim["slug"]]
        render(f"sims/{sim['slug']}.html", sim["slug"], sim=sim, relacionados=outros,
               dados_estruturados=dados_estruturados(sim, config))
        paginas.append((sim["slug"] + "/", "0.9"))

    for nome in ["sobre", "privacidade"]:
        render(f"paginas/{nome}.html", nome)
        paginas.append((nome + "/", "0.3"))

    # 404 precisa ficar na raiz como 404.html e usar links absolutos
    html_404 = env.get_template("paginas/404.html").render(
        site=config, raiz=config["url_base"] + "/", caminho="404", ativos=ativos,
        em_breve=em_breve)
    (SAIDA / "404.html").write_text(html_404, encoding="utf-8")

    # sitemap.xml e robots.txt
    hoje = config["atualizado_em"]
    urls = "\n".join(
        f"  <url><loc>{config['url_base']}/{c}</loc><lastmod>{hoje}</lastmod>"
        f"<priority>{p}</priority></url>" for c, p in paginas)
    (SAIDA / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{urls}\n</urlset>\n", encoding="utf-8")
    (SAIDA / "robots.txt").write_text(
        f"User-agent: *\nAllow: /\n\nSitemap: {config['url_base']}/sitemap.xml\n",
        encoding="utf-8")

    # ads.txt (só funciona com domínio próprio, na raiz do domínio)
    if config.get("adsense_client"):
        pub = config["adsense_client"].replace("ca-", "")
        (SAIDA / "ads.txt").write_text(
            f"google.com, {pub}, DIRECT, f08c47fec0942fa0\n", encoding="utf-8")

    if config.get("dominio_proprio"):
        (SAIDA / "CNAME").write_text(config["dominio_proprio"] + "\n", encoding="utf-8")
    (SAIDA / ".nojekyll").write_text("", encoding="utf-8")

    print(f"Site gerado em {SAIDA} ({len(paginas)} páginas + 404).")


def servir(porta=8000):
    handler = partial(SimpleHTTPRequestHandler, directory=str(SAIDA))
    print(f"Abrindo em http://localhost:{porta}  (Ctrl+C para parar)")
    ThreadingHTTPServer(("localhost", porta), handler).serve_forever()


if __name__ == "__main__":
    main()
    if "--servir" in sys.argv:
        servir()
