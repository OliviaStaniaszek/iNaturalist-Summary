// src/utils.js

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const day = date.getDate();
  const suffix = day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th';
  const month = date.toLocaleString('default', { month: 'long' });
  const year = date.getFullYear();
  return `${day}${suffix} ${month} ${year}`;
}

export function formatMonthKey(monthKey) {
  const [year, month] = monthKey.split('-');
  return new Date(`${year}-${month}-01`).toLocaleString('en-GB', {
    month: 'short',
    year: 'numeric'
  });
}

export function getMonthlyObservationCounts(observations) {
  const monthlyCounts = {};
  for (const obs of observations) {
    if (!obs.observed_on) continue;
    const date = new Date(obs.observed_on);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyCounts[key] = (monthlyCounts[key] || 0) + 1;
  }
  return Object.entries(monthlyCounts).sort(([a], [b]) => new Date(a) - new Date(b));
}

export function getCitySummary(observations) {
  const counts = {};

  for (const obs of observations) {
    const place = obs.place_guess;
    if (!place) continue;

    const parts = place.split(',').map(p => p.trim());
    let label = place;

    if (parts.length >= 2) {
      label = `${parts[parts.length - 2]}, ${parts[parts.length - 1]}`;
    }

    counts[label] = (counts[label] || 0) + 1;
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
}

export function getTaxonSummary(observations) {
  const taxonCounts = {};
  for (const obs of observations) {
    const group = obs.taxon?.iconic_taxon_name || 'Unknown';
    const species = obs.taxon?.name;
    if (!species) continue;

    if (!taxonCounts[group]) taxonCounts[group] = new Set();
    taxonCounts[group].add(species);
  }

  const counts = Object.entries(taxonCounts).map(([group, speciesSet]) => ({
    group,
    count: speciesSet.size
  }));

  return counts.sort((a, b) => b.count - a.count);
}
