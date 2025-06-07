<script>
  // app.svelte
  import { onMount, tick } from 'svelte';
  import Chart from 'chart.js/auto';
  import './app.css';
  import {
    formatDate,
    formatMonthKey,
    getMonthlyObservationCounts,
    getCitySummary,
    getTaxonSummary
  } from './utils.js';

    
  let citySummary = [];

  $: citySummary = getCitySummary(observations);

  let isLoading = false;

  let username = 'distortedbeetle';
  let inputUsername = '';
  let range = '30d'; // '30d', '6m', '1y'

  let observations = [];
  
  let chart;
  let monthChart;
  let taxonChart;

  /** @type {HTMLCanvasElement} */
  let barChartEl;
  /** @type {HTMLCanvasElement} */
  let taxonChartEl;
  /** @type {HTMLCanvasElement} */
  let monthlyChartEl;
 


  let summaryText = '';
  let topTaxonSummary = '';
  const taxonLabels = {
    Insecta: { name: 'insects', emoji: '🐜' },
    Aves: { name: 'birds', emoji: '🐦' },
    Mammalia: { name: 'mammals', emoji: '🦊' },
    Reptilia: { name: 'reptiles', emoji: '🦎' },
    Amphibia: { name: 'amphibians', emoji: '🐸' },
    Actinopterygii: { name: 'fish', emoji: '🐟' },
    Arachnida: { name: 'arachnids', emoji: '🕷️' },
    Mollusca: { name: 'mollusks', emoji: '🐚' },
    Plantae: { name: 'plants', emoji: '🌿' },
    Fungi: { name: 'fungi', emoji: '🍄' },
    Protozoa: { name: 'protozoa', emoji: '🔬' },
    Chromista: { name: 'chromists', emoji: '🧫' },
    Animalia: { name: 'animals', emoji: '🦓' },
    Unknown: { name: 'unknowns', emoji: '❓' }
  };

  const taxonPhrases = {
    Actinopterygii: [
      "Master Angler! You observed {n} unique fish!",
      "You're a certified Fish Finder – {n} aquatic species documented!",
      "Splash! {n} fish recorded — you're reeling them in!",
      "From rivers to reefs: {n} fish spotted!"
    ],
    Aves: [
      "Birdwatch Pro! {n} birds spotted across habitats!",
      "Wings everywhere! {n} unique birds recorded!",
      "Tweet tweet! You logged {n} different birds!",
      "From owls to egrets, you're a top birder!"
    ],
    Insecta: [
      "Bug Collector! {n} insect species found!",
      "Wings, legs, and antennae — you've seen them all!",
      "Creepy crawlies rejoice: {n} insects spotted!",
      "Entomologist in the making — {n} bug kinds identified!"
    ],
    Mammalia: [
      "Furry Friend Finder! {n} mammals observed!",
      "You've tracked the wild — {n} mammals recorded!",
      "From mice to moose: {n} mammalian sightings!",
      "Top of the food chain observer — {n} mammals!"
    ],
    Plantae: [
      "Plant Whisperer! {n} different plants recorded!",
      "Leaf it to you — {n} botanical wonders spotted!",
      "A blooming success: {n} plants!",
      "Nature journal envy — {n} species of flora!"
    ],
    Fungi: [
      "Fungi Forager! {n} types of fungi documented!",
      "Mushroom magic! {n} species identified!",
      "Spores and stories — {n} fungi added to your journal!"
    ],
    Arachnida: [
      "Web Watcher! You found {n} arachnids!",
      "Creepy but cool — {n} arachnids logged!",
      "You’re braver than most — {n} spiders and scorpions!",
      "Tiny terrors? {n} observed. Respect."
    ],
    Mollusca: [
      "Shell Seeker! {n} mollusks collected!",
      "Cephalopods and snails – {n} species recorded!",
      "Soft-bodied biodiversity champ — {n} mollusks!"
    ],
    Amphibia: [
      "Swamp Sleuth! {n} amphibians tracked!",
      "From frogs to salamanders — {n} species noted!",
      "Hop to it! You found {n} amphibian types!"
    ],
    Reptilia: [
      "Reptile Ranger! {n} cold-blooded creatures observed!",
      "Scales and tales — {n} reptiles logged!",
      "Slithering success! {n} reptilian species found!"
    ],
    Unknown: [
      "Biodiversity Buff! {n} species observed across taxa!",
      "What a mix — your log spans ecosystems!",
      "Great work documenting the web of life!",
      "Nature generalist — curious about everything!"
    ]
  };


  let selectedClasses = Object.keys(taxonLabels);

  let uniqueSpeciesCount = 0;
  let mostActiveDay = '';
  let mostActiveDayCount = 0;

  let dailyChartEl;
  let dailyChart;



  function getStartDate() {
    const now = new Date();
    if (range === '30d') now.setDate(now.getDate() - 30);
    else if (range === '6m') now.setMonth(now.getMonth() - 6);
    else now.setFullYear(now.getFullYear() - 1);
    return now.toISOString().split('T')[0];
  }

  async function fetchObservations() {
    isLoading = true;

    const d1 = getStartDate();
    const d2 = new Date().toISOString().split('T')[0];

    const url = new URL('https://api.inaturalist.org/v1/observations');
    if (username) url.searchParams.set('user_id', username);
    url.searchParams.set('d1', d1);
    url.searchParams.set('d2', d2);
    url.searchParams.set('verifiable', 'true');
    url.searchParams.set('per_page', '200');

    const res = await fetch(url.toString());
    const data = await res.json();
    observations = data.results;

    //await drawChart();
    //await drawPieChart();
    await drawDailyChart();


    const speciesSet = new Set();
    const dateCounts = {};

    for (const obs of observations) {
      const name = obs.taxon?.preferred_common_name || obs.species_guess || 'Unknown';
      speciesSet.add(name);

      const date = obs.observed_on;
      if (date) {
        dateCounts[date] = (dateCounts[date] || 0) + 1;
      }
    }

    
    updateTopTaxonSummary() 

    uniqueSpeciesCount = speciesSet.size;

    const sortedDates = Object.entries(dateCounts).sort((a, b) => b[1] - a[1]);
    if (sortedDates.length > 0) {
      const [mostDate, count] = sortedDates[0];
      mostActiveDay = formatDate(mostDate);
      mostActiveDayCount = count;
    }

    if (range === '1y') {
      await drawMonthlyChart();
    } else {
      await drawDailyChart();
    }

    isLoading = false;
  }

  function submitUsername() {
    username = inputUsername.trim();
    fetchObservations();
  }

  async function drawChart() {
  await tick();

  if (!barChartEl) return; 

  const speciesCounts = {};
  for (const obs of observations) {
    const name = obs.taxon?.preferred_common_name || obs.species_guess || 'Unknown';
    speciesCounts[name] = (speciesCounts[name] || 0) + 1;
  }

  const topSpecies = Object.entries(speciesCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const labels = topSpecies.map(([name]) => name);
  const counts = topSpecies.map(([, count]) => count);

  if (chart) chart.destroy();

  chart = new Chart(barChartEl.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Top Observed Species',
        data: counts,
        backgroundColor: '#4caf50',
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { autoSkip: false, maxRotation: 45, minRotation: 45 } }
      }
    }
  });
}

  async function drawMonthlyChart() {
  await tick(); // wait for canvas to mount

  const monthlyData = getMonthlyObservationCounts(observations); // <== FIXED here
  const labels = monthlyData.map(([key]) => formatMonthKey(key));
  const counts = monthlyData.map(([, count]) => count);

  if (monthChart) monthChart.destroy();

  monthChart = new Chart(monthlyChartEl.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Observations per Month',
        data: counts,
        backgroundColor: '#668458',
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 45,
            font: { family: 'Tenali Ramakrishna' }
          }
        },
        y: {
          beginAtZero: true,
          title: {
            display: false,
            text: 'Observations',
            font: { family: 'Tenali Ramakrishna' }
          },
          ticks: {
            font: { family: 'Tenali Ramakrishna' }
          }
        }
      }
    }
  });
}

 

  async function drawPieChart() {
    await tick();

    const groupCounts = {};

    for (const obs of observations) {
      const group = obs.taxon?.iconic_taxon_name || 'Unknown';
      groupCounts[group] = (groupCounts[group] || 0) + 1;
    }

    const sorted = Object.entries(groupCounts).sort((a, b) => b[1] - a[1]);

    // Build emoji + common name summary
    if (sorted.length >= 2) {
      const [top1, top2] = sorted;

      const label1 = taxonLabels[top1[0]] || { name: top1[0].toLowerCase(), emoji: '' };
      const label2 = taxonLabels[top2[0]] || { name: top2[0].toLowerCase(), emoji: '' };

      topTaxonSummary = `You observed ${top1[1]} ${label1.emoji} ${label1.name} and ${top2[1]} ${label2.emoji} ${label2.name}!`;
    } else if (sorted.length === 1) {
      const [top] = sorted;
      const label = taxonLabels[top[0]] || { name: top[0].toLowerCase(), emoji: '' };

      topTaxonSummary = `You observed ${top[1]} ${label.emoji} ${label.name}!`;
    } else {
      topTaxonSummary = '';
    }

    const labels = sorted.map(([name]) => name);
    const counts = sorted.map(([, count]) => count);

    if (taxonChart) taxonChart.destroy();

    taxonChart = new Chart(taxonChartEl.getContext('2d'), {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          label: 'Observation Types',
          data: counts,
          backgroundColor: [
            '#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#e91e63',
            '#00bcd4', '#ffc107', '#607d8b', '#f44336', '#795548'
          ],
          borderWidth: 0 
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              generateLabels: (chart) => {
                const data = chart.data;
                return data.labels.map((taxon, i) => {
                  const label = taxonLabels[taxon] || { name: taxon, emoji: '' };
                  return {
                    text: `${label.emoji} ${label.name}`,
                    fillStyle: data.datasets[0].backgroundColor[i],
                    strokeStyle: data.datasets[0].backgroundColor[i],
                    lineWidth: 0,
                    hidden: false,
                    index: i
                  };
                });
              }
            }
          }
        }
      }
    });
  }

  
  function updateTopTaxonSummary() {
    const taxonStats = getTaxonSummary(observations);

    if (!taxonStats.length) return;

    const top = taxonStats[0];
    const phrases = taxonPhrases[top.group] || taxonPhrases.Unknown;
    const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];

    summaryText = randomPhrase.replace('{n}', top.count);
  }



  function toggleClassFilter(className) {
    if (selectedClasses.includes(className)) {
      selectedClasses = selectedClasses.filter(c => c !== className);
    } else {
      selectedClasses = [...selectedClasses, className];
    }
  }

  function isClassVisible(obs) {
    return selectedClasses.includes(obs.taxon?.iconic_taxon_name);
  }

  async function drawDailyChart() {
  await tick();

  if (!dailyChartEl) return;

  const dayCounts = {};

  for (const obs of observations) {
    const date = obs.observed_on?.split('T')[0];
    if (date) {
      dayCounts[date] = (dayCounts[date] || 0) + 1;
    }
  }

  const sortedDays = Object.entries(dayCounts).sort(
    ([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime()
  );
  const labels = sortedDays.map(([date]) => date);
  const counts = sortedDays.map(([, count]) => count);

  if (dailyChart) dailyChart.destroy();

  dailyChart = new Chart(dailyChartEl.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Observations per Day',
        data: counts,
        backgroundColor: '#668458'  // your requested colour
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => {
              const date = new Date(items[0].label);
              const day = date.getDate();
              const suffix = day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th';
              const month = date.toLocaleString('default', { month: 'long' });
              const year = date.getFullYear();
              return `${day}${suffix} ${month} ${year}`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { display: false },
          grid: { display: false },
          title: { display: false, text: 'Date', font: { family: 'Tenali Ramakrishna' } }  // font
        },
        y: {
          beginAtZero: true,
          title: { display: false, text: 'Observations', font: { family: 'Tenali Ramakrishna' } },  // font
          ticks: {
            font: {
              family: 'Tenali Ramakrishna'  // font for y-axis numbers
            }
          }
        }
      }
    }
  });
}

  onMount(fetchObservations);
</script>


<!-- MARKUP -->
 <link href="https://fonts.googleapis.com/css2?family=IM+Fell+DW+Pica+SC&family=Tenali+Ramakrishna&display=swap" rel="stylesheet">
  <!--loading  -->
 {#if isLoading}
    <div class="loading-overlay">
      <div class="loading-box"><h2>Loading...</h2></div>
    </div>
  {/if}


 <section>
  <h1>iNaturalist Wrapped</h1>
 </section>

 <!-- Username input -->
<section>
  <h3>Username</h3>
  <input
    type="text"
    placeholder="iNaturalist username"
    bind:value={inputUsername}
    on:keydown={(e) => e.key === 'Enter' && submitUsername()}
    style="padding: 0.5rem; width: 250px;"
  />
  <button on:click={submitUsername} style="margin-left: 0.5rem;">Go</button>


<!-- Range buttons -->
  <h3>Time Range</h3>
  <div class="range-buttons">
    <button on:click={() => { range = '30d'; fetchObservations(); }} disabled={range === '30d'}>
      Past 30 Days
    </button>
    <button on:click={() => { range = '6m'; fetchObservations(); }} disabled={range === '6m'}>
      Past 6 Months
    </button>
    <button on:click={() => { range = '1y'; fetchObservations(); }} disabled={range === '1y'}>
      Past Year
    </button>
  </div>


<!-- Filter Photo Gallery by Class -->
  <br>
  <h3>Filter Photo Gallery by Class</h3>
  <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
    {#each Object.keys(taxonLabels) as className}
      <label class="checkbox-wrapper container">
  <input type="checkbox" bind:group={selectedClasses} value={className} />
  <span class="checkmark"></span>
  {taxonLabels[className]?.emoji} {taxonLabels[className]?.name}
</label>

    {/each}
  </div>
</section>
<br>
<!-- Title -->
 <section>
  <h1>{username}'s iNaturalist Wrapped</h1>
  <h2>
    {range === '30d' ? 'last 30 days' : range === '6m' ? 'last 6 months' : 'last year'}
  </h2>
</section>
 
<!-- Natural language summary -->

<!-- {#if summaryText}
  <section>
    <p style="text-align: center;">{summaryText}</p>
  </section>
{/if} -->

<!-- Stats + Highlight side by side -->
<div class="stats-highlight-wrapper desktop-only">
  <section class="stats-box">
    <h2>Stats</h2>
    <ol style="margin: 0; padding-left: 1.5rem;">
      {#each getTaxonSummary(observations).slice(0, 5) as stat}
        <li>
          {taxonLabels[stat.group]?.name || stat.group}: {stat.count}
        </li>
      {/each}
    </ol>
    <p>Total Unique: {uniqueSpeciesCount} </p>
    <p>Total Observed: {observations.length}</p>
  </section>

  {#if observations.filter(o => o.photos && o.photos.length > 0).length > 0}
    <section class="highlight-box">
      <h2 style="text-align: center;">Highlight</h2>
      {#each observations.filter(o => o.photos && o.photos.length > 0).slice(0, 1) as obs}
        <img src={obs.photos[0].url.replace('square', 'medium')} alt={obs.species_guess} />
      {/each}
    </section>
  {/if}
</div>


<!-- Daily Observations -->
<section>
  <h2>{range === '1y' ? 'Observations per Month' : 'Daily Observations'}</h2>
  {#if range !== '1y'}
    <p style="text-align: center;">
      On <strong>{mostActiveDay}</strong>, you made <strong>{mostActiveDayCount}</strong> observations!
    </p>
  {/if}
  <div class="chart-wrapper">
    {#if range === '1y'}
      <canvas bind:this={monthlyChartEl}></canvas>
    {:else}
      <canvas bind:this={dailyChartEl}></canvas>
    {/if}
  </div>
</section>


<!-- Photo Highlights Grid -->
<section>
  <h2>Photo Highlights</h2>
  <div class="gallery">
    {#each observations.filter(o => o.photos && o.photos.length > 0 && isClassVisible(o)).slice(0, 100) as obs}
      <a href={obs.uri} target="_blank" class="gallery-item">
        <img src={obs.photos[0].url.replace('square', 'medium')} alt={obs.species_guess} />
        <div class="caption">{obs.species_guess}</div>
      </a>
    {/each}
  </div>
</section>