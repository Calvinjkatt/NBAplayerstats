let selectedPlayer = null;
let statsChart = null;

document.getElementById("playerSearch").addEventListener("input", async (e) => {
  const query = e.target.value;
  if (query.length < 2) {
    document.getElementById("playerResults").style.display = "none";
    return;
  }

  const response = await fetch(`/search_players?query=${query}`);
  const players = await response.json();

  const resultsDiv = document.getElementById("playerResults");
  resultsDiv.innerHTML = "";
  resultsDiv.style.display = "block";

  players.forEach((player) => {
    const div = document.createElement("div");
    div.className = "player-result";
    div.textContent = player.full_name;
    div.onclick = () => selectPlayer(player);
    resultsDiv.appendChild(div);
  });
});

async function selectPlayer(player) {
  selectedPlayer = player;
  document.getElementById("playerSearch").value = player.full_name;
  document.getElementById("playerResults").style.display = "none";
  document.querySelector(".team-section").style.display = "block";

  // Load teams
  const response = await fetch("/get_teams");
  const teams = await response.json();

  const teamSelect = document.getElementById("teamSelect");
  teamSelect.innerHTML = '<option value="">Select a team...</option>';
  teams.forEach((team) => {
    const option = document.createElement("option");
    option.value = team.id;
    option.textContent = team.full_name;
    teamSelect.appendChild(option);
  });
}

document.getElementById("teamSelect").addEventListener("change", async (e) => {
  if (!selectedPlayer || !e.target.value) return;

  const response = await fetch(
    `/get_stats?player_id=${selectedPlayer.id}&team_id=${e.target.value}`
  );
  const stats = await response.json();

  displayStats(stats);
});

function displayStats(stats) {
  const container = document.getElementById("statsContainer");
  if (stats.length === 0) {
    container.innerHTML =
      "<p>No games found. This could be because:</p>" +
      "<ul>" +
      "<li>The player hasn't played against this team in the last 3 seasons</li>" +
      "<li>The player might be inactive or a rookie</li>" +
      "<li>The data might not be available yet</li>" +
      "</ul>";
    return;
  }

  let html = `
        <table class="stats-table">
            <tr>
                <th>Date</th>
                <th>Matchup</th>
                <th>Points</th>
                <th>Rebounds</th>
                <th>Assists</th>
            </tr>
    `;

  stats.forEach((game) => {
    html += `
            <tr>
                <td>${game.GAME_DATE}</td>
                <td>${game.MATCHUP}</td>
                <td>${game.PTS}</td>
                <td>${game.REB}</td>
                <td>${game.AST}</td>
            </tr>
        `;
  });

  html += "</table>";
  container.innerHTML = html;

  // Add three separate chart containers
  container.innerHTML += `
        <div class="charts-grid">
            <div class="chart-section">
                <h3>Points Per Game</h3>
                <div class="chart-container">
                    <canvas id="pointsChart"></canvas>
                </div>
            </div>
            <div class="chart-section">
                <h3>Assists Per Game</h3>
                <div class="chart-container">
                    <canvas id="assistsChart"></canvas>
                </div>
            </div>
            <div class="chart-section">
                <h3>Rebounds Per Game</h3>
                <div class="chart-container">
                    <canvas id="reboundsChart"></canvas>
                </div>
            </div>
        </div>
    `;

  // Create all three charts
  createAllCharts(stats);
}

function createAllCharts(stats) {
  // Sort games by date
  stats.sort((a, b) => new Date(a.GAME_DATE) - new Date(b.GAME_DATE));
  const dates = stats.map((game) =>
    new Date(game.GAME_DATE).toLocaleDateString()
  );

  const chartConfigs = [
    {
      id: "pointsChart",
      stat: "PTS",
      label: "Points",
      color: "rgb(255, 99, 132)",
    },
    {
      id: "assistsChart",
      stat: "AST",
      label: "Assists",
      color: "rgb(54, 162, 235)",
    },
    {
      id: "reboundsChart",
      stat: "REB",
      label: "Rebounds",
      color: "rgb(75, 192, 192)",
    },
  ];

  chartConfigs.forEach((config) => {
    const ctx = document.getElementById(config.id).getContext("2d");
    const statData = stats.map((game) => game[config.stat]);

    new Chart(ctx, {
      type: "line",
      data: {
        labels: dates,
        datasets: [
          {
            label: config.label,
            data: statData,
            borderColor: config.color,
            backgroundColor: config.color + "33",
            tension: 0.1,
            fill: true,
            pointRadius: 5,
            pointHoverRadius: 7,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: false,
          },
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: config.label,
            },
          },
          x: {
            title: {
              display: true,
              text: "Game Date",
            },
          },
        },
        interaction: {
          intersect: false,
          mode: "index",
        },
      },
    });
  });
}
