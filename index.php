<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Planet Defender</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="game-wrapper">
        <h1>Planet Defender</h1>
        <div id="game-container">
            <canvas id="gameCanvas" width="800" height="600"></canvas>

            <!-- Overlays for game states -->
            <div id="start-screen" class="overlay">
                <h2>Planet Defender</h2>
                <p>Appuyez sur une touche pour commencer</p>
            </div>
            <div id="game-over-screen" class="overlay" style="display: none;">
                <h2>Game Over</h2>
                <p>Vous avez survécu <span id="final-wave">0</span> vagues</p>
                <p>Appuyez sur une touche pour rejouer</p>
            </div>
        </div>
        <div id="ui-container">
            <div id="game-stats">
                <p>Argent: <span id="money">150</span>$</p>
                <p>Vague: <span id="wave">0</span></p>
                <p>Vie: <span id="planet-health">1000</span></p>
                <button id="next-wave-btn" style="display: none;">Lancer la Vague</button>
            </div>
            <div id="turret-selection">
                <p>Construire :</p>
                <div class="turret-choice active" data-turret="Turret">
                    <span>Tourelle</span>
                    <span class="turret-cost">50$</span>
                </div>
                <div class="turret-choice" data-turret="LaserTurret">
                    <span>Laser</span>
                    <span class="turret-cost">120$</span>
                </div>
            </div>
            <div id="turret-info-panel">
                <h4>Informations</h4>
                <p>Nom: <span id="info-name">-</span></p>
                <p>Niveau: <span id="info-level">-</span></p>
                <p>Dégâts: <span id="info-damage">-</span></p>
                <p>Portée: <span id="info-range">-</span></p>
                <p>Cadence: <span id="info-firerate">-</span></p>
                <p>Coût Amélioration: <span id="info-upgrade-cost">-</span></p>
            </div>
        </div>
    </div>
    <script src="game.js"></script>
</body>
</html>
