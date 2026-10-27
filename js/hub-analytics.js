/* Hub visits and catalogue referrals, not proof of gameplay. */
(function () {
  const ga = window.GameAnalytics;
  const games = window.JB_GAMES || [];
  const source = new URLSearchParams(location.search).get('from');
  ga?.emit('hub_view', {source_game: games.some(g => g.id === source) ? source : 'direct_or_other'});
  function click(e) {
    if(e.type === 'auxclick' && e.button !== 1) return;
    const link = e.target.closest?.('a[href]');
    if(!link) return;
    const game = games.find(g => g.status === 'live' && g.url && new URL(g.url, location.href).href === link.href);
    if(!game) return;
    ga?.emit('game_click', {destination_game: game.id, link_position: link.closest('#grid') ? 'catalogue' : link.closest('#bro-dialog') ? 'bro_profile' : link.closest('dialog') ? 'world_popup' : 'recommendation'});
  }
  document.addEventListener('click',click);
  document.addEventListener('auxclick',click);
})();
