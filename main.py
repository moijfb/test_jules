import pygame
import sys
import math
import random

# 1. Initialisation de Pygame
pygame.init()

# 2. Constantes du jeu
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
PLANET_RADIUS = 100
PLANET_Y_POSITION = SCREEN_HEIGHT + PLANET_RADIUS - 50

# Couleurs
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
BLUE = (0, 0, 255)

# 3. Création de la fenêtre de jeu
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("Planet Defender")
clock = pygame.time.Clock()

# 4. Polices
font = pygame.font.Font(None, 28)
big_font = pygame.font.Font(None, 72)

# --- Classes du jeu ---

class Planet:
    def __init__(self):
        self.x = SCREEN_WIDTH // 2
        self.y = PLANET_Y_POSITION
        self.radius = PLANET_RADIUS
        self.color = BLUE
        self.health = 1000

    def draw(self, screen):
        pygame.draw.circle(screen, self.color, (self.x, self.y), self.radius)

class Enemy(pygame.sprite.Sprite):
    """Classe de base pour tous les ennemis."""
    def __init__(self, x, y, speed, health, value, image):
        super().__init__()
        self.image = image
        self.rect = self.image.get_rect(center=(x, y))
        self.speed = speed
        self.health = health
        self.value = value

    def update(self, planet):
        self.rect.y += self.speed
        dist_to_planet_center = math.hypot(self.rect.centerx - planet.x, self.rect.centery - planet.y)
        if dist_to_planet_center < planet.radius:
            planet.health -= 10
            self.kill()
        elif self.rect.top > SCREEN_HEIGHT:
            self.kill()

class BasicShip(Enemy):
    def __init__(self, x, y, speed):
        img = pygame.Surface((30, 30)); img.fill((255, 0, 0))
        super().__init__(x, y, speed, 20, 10, img)

class FastShip(Enemy):
    def __init__(self, x, y, speed):
        img = pygame.Surface((20, 20)); img.fill((255, 165, 0))
        super().__init__(x, y, speed * 1.5, 10, 15, img)

class Projectile(pygame.sprite.Sprite):
    def __init__(self, x, y, target_enemy, damage, color):
        super().__init__()
        self.image = pygame.Surface((5, 10)); self.image.fill(color)
        self.rect = self.image.get_rect(center=(x, y))
        self.speed = 10
        self.damage = damage
        dx, dy = target_enemy.rect.centerx - x, target_enemy.rect.centery - y
        distance = math.hypot(dx, dy)
        if distance == 0: self.dx, self.dy = 0, -self.speed
        else: self.dx, self.dy = (dx / distance) * self.speed, (dy / distance) * self.speed

    def update(self):
        self.rect.x += self.dx; self.rect.y += self.dy
        if not screen.get_rect().colliderect(self.rect): self.kill()

class Defense(pygame.sprite.Sprite):
    """Classe de base pour toutes les défenses."""
    def __init__(self, x, y, range, fire_rate, cost, projectile_damage, projectile_color):
        super().__init__()
        self.level = 1
        self.cost = cost
        self.upgrade_cost = int(cost * 1.5)
        self.range = range
        self.fire_rate = fire_rate
        self.projectile_damage = projectile_damage
        self.projectile_color = projectile_color
        self.last_shot_time = pygame.time.get_ticks()
        self.rect = pygame.Rect(0, 0, 40, 40)
        self.rect.center = (x, y)
        self.update_image()

    def update_image(self):
        self.image = pygame.Surface((40, 40), pygame.SRCALPHA)
        color = (min(255, 50 + self.level * 25), max(0, 255 - self.level * 25), 0)
        pygame.draw.circle(self.image, color, (20, 20), 20)
        level_text = font.render(str(self.level), True, WHITE)
        self.image.blit(level_text, level_text.get_rect(center=(20, 20)))

    def find_target(self, enemies):
        for enemy in enemies:
            if math.hypot(self.rect.centerx - enemy.rect.centerx, self.rect.centery - enemy.rect.centery) <= self.range:
                return enemy
        return None

    def update(self, enemies_group, projectiles_group, all_sprites_group):
        target = self.find_target(enemies_group)
        if target:
            now = pygame.time.get_ticks()
            if now - self.last_shot_time >= 60000 / self.fire_rate:
                self.last_shot_time = now
                projectile = Projectile(self.rect.centerx, self.rect.centery, target, self.projectile_damage, self.projectile_color)
                projectiles_group.add(projectile)
                all_sprites_group.add(projectile)

    def upgrade(self):
        self.level += 1
        self.range += 10
        self.projectile_damage += 5
        self.upgrade_cost = int(self.upgrade_cost * 1.8)
        self.update_image()

class Turret(Defense):
    def __init__(self, x, y):
        super().__init__(x, y, range=150, fire_rate=70, cost=50, projectile_damage=10, projectile_color=(0, 255, 255))

class LaserTurret(Defense):
    def __init__(self, x, y):
        super().__init__(x, y, range=250, fire_rate=20, cost=120, projectile_damage=40, projectile_color=(255, 0, 255))

# --- Groupes de Sprites ---
all_sprites = pygame.sprite.Group()
enemies = pygame.sprite.Group()
defenses = pygame.sprite.Group()
projectiles = pygame.sprite.Group()

# --- Variables de jeu ---
player_money = 100
wave = 0
wave_ongoing = False
last_spawn_time = 0
enemies_to_spawn = 0
selected_turret = "Turret"
planet = None

# --- Constantes de l'économie ---
TURRET_TYPES = {
    "Turret": {"class": Turret, "cost": 50},
    "LaserTurret": {"class": LaserTurret, "cost": 120}
}

def start_next_wave():
    global wave, wave_ongoing, enemies_to_spawn
    wave += 1; wave_ongoing = True; enemies_to_spawn = 5 + wave * 2

def spawn_enemy():
    x = random.randint(50, SCREEN_WIDTH - 50)
    y = -50
    speed = random.uniform(1, 2 + wave * 0.5)
    enemy = FastShip(x, y, speed) if random.random() < 0.2 + (wave * 0.02) else BasicShip(x, y, speed)
    enemies.add(enemy); all_sprites.add(enemy)

def draw_ui(screen):
    money_text = font.render(f"Argent: {player_money}$", True, WHITE)
    screen.blit(money_text, (10, 10))
    wave_text = font.render(f"Vague: {wave}", True, WHITE)
    screen.blit(wave_text, (10, 40))
    health_text = font.render(f"Vie: {planet.health}", True, WHITE)
    screen.blit(health_text, (10, 70))
    turret_info = TURRET_TYPES[selected_turret]
    select_text = font.render(f"Sélection (1,2): {selected_turret} ({turret_info['cost']}$)", True, WHITE)
    screen.blit(select_text, (10, 110))

def main():
    global player_money, selected_turret, last_spawn_time, wave_ongoing, enemies_to_spawn, planet, game_state
    game_state = 'start_menu'

    def reset_game():
        global player_money, wave, wave_ongoing, enemies_to_spawn, selected_turret, planet
        player_money = 150; wave = 0; wave_ongoing = False; enemies_to_spawn = 0
        selected_turret = "Turret"; planet = Planet()
        all_sprites.empty(); enemies.empty(); defenses.empty(); projectiles.empty()

    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT: running = False
            if event.type == pygame.KEYDOWN:
                if game_state == 'start_menu' or game_state == 'game_over':
                    if game_state == 'start_menu': reset_game()
                    game_state = 'playing' if game_state == 'start_menu' else 'start_menu'
                elif game_state == 'playing':
                    if event.key == pygame.K_1: selected_turret = "Turret"
                    elif event.key == pygame.K_2: selected_turret = "LaserTurret"

            if game_state == 'playing' and event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                mouse_x, mouse_y = pygame.mouse.get_pos()
                clicked_on_defense = False
                for defense in defenses:
                    if defense.rect.collidepoint(mouse_x, mouse_y):
                        if player_money >= defense.upgrade_cost:
                            player_money -= defense.upgrade_cost
                            defense.upgrade()
                        clicked_on_defense = True
                        break
                if clicked_on_defense: continue
                turret_info = TURRET_TYPES[selected_turret]
                if player_money >= turret_info['cost']:
                    if planet.radius - 20 < math.hypot(mouse_x - planet.x, mouse_y - planet.y) < planet.radius + 20:
                        angle = math.atan2(mouse_y - planet.y, mouse_x - planet.x)
                        px, py = planet.x + math.cos(angle) * (planet.radius-20), planet.y + math.sin(angle) * (planet.radius-20)
                        new_turret = turret_info['class'](px, py)
                        defenses.add(new_turret); all_sprites.add(new_turret)
                        player_money -= turret_info['cost']

        screen.fill(BLACK)
        if game_state == 'start_menu':
            title = big_font.render("PLANET DEFENDER", True, WHITE)
            start = font.render("Appuyez sur une touche pour commencer", True, WHITE)
            screen.blit(title, title.get_rect(center=(SCREEN_WIDTH/2, SCREEN_HEIGHT/2 - 50)))
            screen.blit(start, start.get_rect(center=(SCREEN_WIDTH/2, SCREEN_HEIGHT/2 + 20)))
        elif game_state == 'game_over':
            title = big_font.render("GAME OVER", True, (255,0,0))
            score = font.render(f"Vous avez survécu {wave -1} vagues", True, WHITE)
            restart = font.render("Appuyez sur une touche pour rejouer", True, WHITE)
            screen.blit(title, title.get_rect(center=(SCREEN_WIDTH/2, SCREEN_HEIGHT/2 - 50)))
            screen.blit(score, score.get_rect(center=(SCREEN_WIDTH/2, SCREEN_HEIGHT/2 + 20)))
            screen.blit(restart, restart.get_rect(center=(SCREEN_WIDTH/2, SCREEN_HEIGHT/2 + 60)))
        elif game_state == 'playing':
            if not wave_ongoing and not enemies:
                start_next_wave()
            if wave_ongoing and enemies_to_spawn > 0 and pygame.time.get_ticks() - last_spawn_time > 1000:
                spawn_enemy(); enemies_to_spawn -= 1; last_spawn_time = pygame.time.get_ticks()
            elif enemies_to_spawn == 0 and not enemies:
                wave_ongoing = False

            defenses.update(enemies, projectiles, all_sprites); enemies.update(planet); projectiles.update()

            hits = pygame.sprite.groupcollide(projectiles, enemies, True, False)
            for proj, hit_enemies in hits.items():
                for enemy in hit_enemies:
                    enemy.health -= proj.damage
                    if enemy.health <= 0:
                        player_money += enemy.value; enemy.kill()

            if planet.health <= 0: game_state = 'game_over'

            planet.draw(screen)
            all_sprites.draw(screen)
            draw_ui(screen)

        pygame.display.flip()
        clock.tick(60)

    pygame.quit()
    sys.exit()

if __name__ == '__main__':
    main()
