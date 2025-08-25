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
            <p>Argent: <span id="money">150</span>$</p>
            <p>Vague: <span id="wave">0</span></p>
            <p>Vie: <span id="planet-health">1000</span></p>
            <p>Sélection (1,2): <span id="selection">Tourelle</span></p>
        </div>
    </div>
    <script src="game.js"></script>
</body>
</html>
