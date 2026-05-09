/* =========================================================
 * Tracking — Guia Interativo Europa
 *
 * Faz 3 coisas:
 * 1. Captura UTMs / fbclid / gclid da URL atual e guarda em sessionStorage
 *    (sobrevive a reload mas não vaza pra outras sessões)
 * 2. Anexa esses parâmetros nas URLs do checkout Hotmart
 *    pra atribuição funcionar lá no Bloco 3 (CAPI Hotmart)
 * 3. Dispara InitiateCheckout no Pixel quando o botão é clicado
 * ========================================================= */

(function () {
  'use strict';

  // -------- CONFIG --------
  var HOTMART_CHECKOUT = 'https://pay.hotmart.com/A104516580Y?bid=1778344692471';
  var PRODUCT_VALUE = 127.00;
  var CURRENCY = 'BRL';
  var TRACKED_PARAMS = [
    'utm_source', 'utm_medium', 'utm_campaign',
    'utm_content', 'utm_term', 'utm_id',
    'fbclid', 'gclid', 'sck', 'xcod'
  ];

  // -------- 1. Captura UTMs --------
  function captureParams() {
    var params = new URLSearchParams(window.location.search);
    var captured = {};
    TRACKED_PARAMS.forEach(function (k) {
      var v = params.get(k);
      if (v) captured[k] = v;
    });

    if (Object.keys(captured).length > 0) {
      try {
        sessionStorage.setItem('gi_tracking', JSON.stringify(captured));
      } catch (e) { /* sessionStorage indisponível, sem problema */ }
    }
  }

  function getStoredParams() {
    try {
      var raw = sessionStorage.getItem('gi_tracking');
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  // -------- 2. Constrói URL final do Hotmart com UTMs --------
  function buildCheckoutUrl() {
    var stored = getStoredParams();
    var url = new URL(HOTMART_CHECKOUT);

    Object.keys(stored).forEach(function (k) {
      // não sobrescreve params que já vieram na URL base do checkout (ex: bid)
      if (!url.searchParams.has(k)) {
        url.searchParams.set(k, stored[k]);
      }
    });

    // Hotmart usa "sck" como source code próprio — espelha utm_content nele
    // pra ver o nome do criativo direto no painel da Hotmart
    if (!url.searchParams.has('sck') && stored.utm_content) {
      url.searchParams.set('sck', stored.utm_content);
    }

    return url.toString();
  }

  // -------- 3. Liga os botões CTA --------
  function wireCheckoutButtons() {
    var btns = document.querySelectorAll('a[data-cta]');
    btns.forEach(function (btn) {
      // botões que apontam pra "#oferta" são âncoras internas — deixa rolar
      if (btn.getAttribute('href') === '#oferta') return;

      // botão da seção de oferta (e qualquer outro com href="#") vira link Hotmart
      btn.addEventListener('click', function (e) {
        e.preventDefault();

        // dispara InitiateCheckout no Pixel
        if (typeof fbq === 'function') {
          fbq('track', 'InitiateCheckout', {
            value: PRODUCT_VALUE,
            currency: CURRENCY,
            content_name: 'Pack 4 cidades — Guia Interativo Europa',
            content_category: 'Infoproduto · Guia de viagem',
          });
        }

        // pequena espera pro pixel mandar antes do redirect
        var target = buildCheckoutUrl();
        setTimeout(function () { window.location.href = target; }, 200);
      });
    });
  }

  // -------- Boot --------
  captureParams();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireCheckoutButtons);
  } else {
    wireCheckoutButtons();
  }
})();
