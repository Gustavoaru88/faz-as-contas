// Busca e filtro por categoria na página inicial.
const busca = document.getElementById("busca");
const filtros = [...document.querySelectorAll(".filtro")];
const itens = [...document.querySelectorAll("#cartoes .cartoes__item")];
const vazio = document.getElementById("vazio");
let categoria = "";

const normalizar = (t) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function aplicar() {
  const termos = normalizar(busca.value).split(/\s+/).filter(Boolean);
  let visiveis = 0;
  for (const li of itens) {
    const texto = normalizar(li.dataset.busca);
    const ok = (!categoria || li.dataset.cat === categoria) && termos.every((t) => texto.includes(t));
    li.hidden = !ok;
    if (ok) visiveis++;
  }
  vazio.hidden = visiveis > 0;
}

for (const b of filtros) {
  b.addEventListener("click", () => {
    categoria = b.dataset.cat;
    filtros.forEach((f) => f.setAttribute("aria-pressed", String(f === b)));
    aplicar();
  });
}
busca.addEventListener("input", aplicar);
busca.addEventListener("keydown", (ev) => {
  if (ev.key !== "Enter") return;
  const primeiro = itens.find((li) => !li.hidden && li.querySelector("a"));
  if (primeiro) location.href = primeiro.querySelector("a").href;
});
