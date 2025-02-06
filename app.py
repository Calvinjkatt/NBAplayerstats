from flask import Flask, render_template, jsonify, request
from nba_api.stats.static import players
from nba_api.stats.static import teams
from nba_api.stats.endpoints import playergamelog
import pandas as pd

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/search_players')
def search_players():
    query = request.args.get('query', '').lower()
    all_players = players.get_players()
    filtered_players = [
        player for player in all_players 
        if query in player['full_name'].lower()
    ]
    return jsonify(filtered_players[:10])  # Limit to 10 results

@app.route('/get_teams')
def get_teams():
    all_teams = teams.get_teams()
    return jsonify(all_teams)

@app.route('/get_stats')
def get_stats():
    player_id = request.args.get('player_id')
    team_id = request.args.get('team_id')
    
    print("\n=== API Request Info ===")
    print(f"Player ID: {player_id}")
    print(f"Team ID: {team_id}")
    
    # Get multiple seasons of data (last 3 seasons)
    all_games = []
    for season in ['2023-24', '2022-23', '2021-22']:
        try:
            print(f"\nFetching data for season: {season}")
            gamelog = playergamelog.PlayerGameLog(player_id=player_id, season=season)
            games = gamelog.get_data_frames()[0]
            print(f"Games found in {season}: {len(games)}")
            all_games.append(games)
        except Exception as e:
            print(f"Error fetching {season}: {str(e)}")
            continue
    
    if all_games:
        games = pd.concat(all_games)
        print(f"\nTotal games combined: {len(games)}")
    else:
        print("No games found in any season")
        return jsonify([])
    
    # Get team info to get abbreviation
    team_info = teams.find_team_name_by_id(team_id)
    team_abbr = team_info['abbreviation']
    print(f"\nFiltering for team: {team_abbr}")
    
    # Filter games against selected team
    team_games = games[
        games['MATCHUP'].str.contains(f'vs. {team_abbr}') | 
        games['MATCHUP'].str.contains(f'@ {team_abbr}')
    ]
    
    print(f"Games found against {team_abbr}: {len(team_games)}")
    if len(team_games) > 0:
        print("\nSample game data:")
        print(team_games.iloc[0][['GAME_DATE', 'MATCHUP', 'PTS', 'REB', 'AST']])
    
    # Convert to dictionary for JSON response
    stats = team_games.to_dict('records')
    return jsonify(stats)

if __name__ == '__main__':
    app.run(debug=True) 