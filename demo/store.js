const cart = document.querySelector('.cart');
const summary = document.querySelector('#cart-summary');
const count = document.querySelector('#cart-count');
const products = document.querySelector('#products');
let items = 0;

cart.addEventListener('click', () => {
  summary.hidden = !summary.hidden;
  cart.setAttribute('aria-expanded', String(!summary.hidden));
});

products.addEventListener('click', (event) => {
  if (!event.target.closest('.add')) return;
  items++;
  count.textContent = String(items);
  summary.textContent = `${items} ${items === 1 ? 'item' : 'items'} in your bag.`;
});

const more = document.querySelector('#more');
more.addEventListener('click', () => {
  products.append(document.querySelector('#extra-product').content.cloneNode(true));
  more.disabled = true;
  more.hidden = true;
});
