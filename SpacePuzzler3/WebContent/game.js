// # Quintus platformer example
window.addEventListener("load", function() {

	/*******************************************************************************************************************
	 * Set up an instance of the Quintus engine
	 ******************************************************************************************************************/
	var Q = window.Q = Quintus({
		development : true });
	// include the Sprites, Scenes, Input and 2D module
	Q.include("Sprites, Scenes, Input, 2D, Anim, Touch, UI, TMX, Audio");
	// Maximize this game to whatever the size of the browser is
	Q.setup({
		maximize : true })
	// And turn on default input controls and touch input (for UI)
	.controls(true);
	// Enable touch
	Q.touch();
	// Enable sounds.
	Q.enableSound();

	Q.SPRITE_PLAYER = 1;
	Q.SPRITE_COLLECTABLE = 2;
	Q.SPRITE_ENEMY = 4;

	/*******************************************************************************************************************
	 * Create the player
	 ******************************************************************************************************************/
	Q.Sprite.extend("Player", {

		init : function(p) {
			this._super(p, {
				sheet : "player", // Setting a sprite sheet sets sprite width and height
				sprite : "player",
				direction : "right",
				standingPoints : [ [ -16, 44 ], [ -23, 35 ], [ -23, -48 ], [ 23, -48 ], [ 23, 35 ], [ 16, 44 ] ],
				duckingPoints : [ [ -16, 44 ], [ -23, 35 ], [ -23, -10 ], [ 23, -10 ], [ 23, 35 ], [ 16, 44 ] ],
				jumpSpeed : -400,
				speed : 300,
				strength : 100,
				score : 0,
				type : Q.SPRITE_PLAYER,
				collisionMask : Q.SPRITE_DEFAULT | Q.SPRITE_COLLECTABLE });

			this.p.points = this.p.standingPoints;

			this.add('2d, platformerControls, animation, tween');

			this.on("bump.top", "breakTile");

			this.on("sensor.tile", "checkLadder");
			this.on("enemy.hit", "enemyHit");
			this.on("jump");
			this.on("jumped");

		},

		jump : function(obj) {
			if (!obj.p.playedJump) {
				obj.p.playedJump = true;
			}
		},

		jumped : function(obj) {
			obj.p.playedJump = false;
		},

		checkLadder : function(colObj) {
			if (colObj.p.ladder) {
				this.p.onLadder = true;
				this.p.ladderX = colObj.p.x;
			}
		},

		resetLevel : function() {
			Q.stageScene("level1");
			this.p.strength = 100;
			this.animate({
				opacity : 1 });
			Q.stageScene('hud', 3, this.p);
		},

		enemyHit : function(data) {
			console.log('enemyHit');
			var col = data.col;
			this.p.vy = -150;
			if (col.normalX == 1) {
				// Hit from left.
				this.p.x -= 15;
				this.p.y -= 15;
			} else {
				// Hit from right;
				this.p.x += 15;
				this.p.y -= 15;
			}
			this.p.immune = true;
			this.p.immuneTimer = 0;
			this.p.immuneOpacity = 1;
			this.p.strength -= 25;
			Q.stageScene('hud', 3, this.p);
			if (this.p.strength == 0) {
				this.resetLevel();
			}
		},

		continueOverSensor : function() {
			this.p.vy = 0;
			if (this.p.vx != 0) {
				this.play("walk_" + this.p.direction);
			} else {
				this.play("stand_" + this.p.direction);
			}
		},

		breakTile : function(col) {
			if (col.obj.isA("TileLayer")) {
				if (col.tile == 24) {
					col.obj.setTile(col.tileX, col.tileY, 36);
				} else if (col.tile == 36) {
					col.obj.setTile(col.tileX, col.tileY, 24);
				}
			}
		},

		step : function(dt) {
			var processed = false;
			if (this.p.immune) {
				// Swing the sprite opacity between 50 and 100% percent when immune.
				if ((this.p.immuneTimer % 12) == 0) {
					var opacity = (this.p.immuneOpacity == 1 ? 0 : 1);
					this.animate({
						"opacity" : opacity }, 0);
					this.p.immuneOpacity = opacity;
				}
				this.p.immuneTimer++;
				if (this.p.immuneTimer > 144) {
					// 3 seconds expired, remove immunity.
					this.p.immune = false;
					this.animate({
						"opacity" : 1 }, 1);
				}
			}

			if (this.p.onLadder) {
				this.p.gravity = 0;

				if (Q.inputs['up']) {
					this.p.vy = -this.p.speed;
					this.p.x = this.p.ladderX;
					this.play("climb");
				} else if (Q.inputs['down']) {
					this.p.vy = this.p.speed;
					this.p.x = this.p.ladderX;
					this.play("climb");
				} else {
					this.continueOverSensor();
				}
				processed = true;
			}

			if (!processed) {
				this.p.gravity = 1;

				if (Q.inputs['down']) {
					this.p.ignoreControls = true;
					this.play("duck_" + this.p.direction);
					if (this.p.landed > 0) {
						this.p.vx = this.p.vx * (1 - dt * 2);
					}
					this.p.points = this.p.duckingPoints;
				} else {
					this.p.ignoreControls = false;
					this.p.points = this.p.standingPoints;

					if (this.p.vx > 0) {
						if (this.p.landed > 0) {
							this.play("walk_right");
						} else {
							this.play("jump_right");
						}
						this.p.direction = "right";
					} else if (this.p.vx < 0) {
						if (this.p.landed > 0) {
							this.play("walk_left");
						} else {
							this.play("jump_left");
						}
						this.p.direction = "left";
					} else {
						this.play("stand_" + this.p.direction);
					}
				}
			}

			this.p.onLadder = false;

			if (this.p.y > 1000) {
				this.stage.unfollow();
			}

			if (this.p.y > 2000) {
				this.resetLevel();
			}
		} });

	/*******************************************************************************************************************
	 * Create common enemy
	 ******************************************************************************************************************/
	Q.Sprite.extend("Enemy", {
		init : function(p, defaults) {

			this._super(p, Q._defaults(defaults || {}, {
				sheet : p.sprite,
				vx : 200, // TODO: Fehler: vx: 50
				defaultDirection : 'left',
				type : Q.SPRITE_ENEMY,
				collisionMask : Q.SPRITE_DEFAULT }));

			this.add("2d, aiBounce, animation");
			this.on("bump.top", this, "die");
			this.on("hit.sprite", this, "hit");
		},

		step : function(dt) {
			if (this.p.dead) {
				this.del('2d, aiBounce');
				this.p.deadTimer++;
				if (this.p.deadTimer > 24) {
					// Dead for 24 frames, remove it.
					this.destroy();
				}
				return;
			}
			var p = this.p;

			p.vx += p.ax * dt;
			p.vy += p.ay * dt;

			p.x += p.vx * dt;
			p.y += p.vy * dt;

			this.play('walk');
		},

		hit : function(col) {
			if (col.obj.isA("Player") && !col.obj.p.immune && !this.p.dead) {
				col.obj.trigger('enemy.hit', {
					"enemy" : this,
					"col" : col });
			}
		},

		die : function(col) {
			if (col.obj.isA("Player")) {
				this.p.vx = this.p.vy = 0;
				this.play('dead');
				this.p.dead = true;
				col.obj.p.vy = -300;
				this.p.deadTimer = 0;
			}
		} });

	/*******************************************************************************************************************
	 * Create fly enemy
	 ******************************************************************************************************************/
	Q.Enemy.extend("Fly", {

	});

	/*******************************************************************************************************************
	 * Create slime enemy
	 ******************************************************************************************************************/
	Q.Enemy.extend("Slime", {
		init : function(p) {
			this._super(p, {
				w : 55,
				h : 34 });
		} });

	/*******************************************************************************************************************
	 * Create snail enemy
	 ******************************************************************************************************************/
	Q.Enemy.extend("Snail", {
		init : function(p) {
			this._super(p, {
				w : 55,
				h : 34 });
		}

	});

	/*******************************************************************************************************************
	 * Create collectables
	 ******************************************************************************************************************/
	Q.Sprite.extend("Collectable", {
		init : function(p) {
			this._super(p, {
				sheet : p.sprite,
				type : Q.SPRITE_COLLECTABLE,
				collisionMask : Q.SPRITE_PLAYER,
				sensor : true,
				vx : 0,
				vy : 0,
				gravity : 0 });
			this.add("animation");

			this.on("sensor");
		},

		// When a Collectable is hit.
		sensor : function(colObj) {
			// Increment the score.
			if (this.p.amount) {
				colObj.p.score += this.p.amount;
				Q.stageScene('hud', 3, colObj.p);
			}
			this.destroy();
		} });

	/*******************************************************************************************************************
	 * Create the scene : level1
	 ******************************************************************************************************************/
	Q.scene("level1", function(stage) {
		Q.stageTMX("level1.tmx", stage);
		stage.add("viewport").follow(Q("Player").first());
	});

	/*******************************************************************************************************************
	 * Create the scene : hud
	 ******************************************************************************************************************/
	Q.scene('hud', function(stage) {
		var container = stage.insert(new Q.UI.Container({
			x : 50,
			y : 0 }));
		container.insert(new Q.UI.Text({
			x : 200,
			y : 20,
			label : "Score: " + stage.options.score,
			color : "white" }));
		container.insert(new Q.UI.Text({
			x : 50,
			y : 20,
			label : "Health: " + stage.options.strength + '%',
			color : "white" }));
		container.fit(20);
	});

	/*******************************************************************************************************************
	 * load tmx map
	 ******************************************************************************************************************/
	Q.loadTMX("level1.tmx, collectables.json, enemies.json, player.json", function() {
		Q.compileSheets("player.png", "player.json");
		Q.compileSheets("collectables.png", "collectables.json");
		Q.compileSheets("enemies.png", "enemies.json");
		Q.compileSheets("doors.png", "doors.json");
		Q.animations("player", {
			walk_right : {
				frames : [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ],
				rate : 1 / 15,
				flip : false,
				loop : true },
			walk_left : {
				frames : [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ],
				rate : 1 / 15,
				flip : "x",
				loop : true },
			jump_right : {
				frames : [ 13 ],
				rate : 1 / 10,
				flip : false },
			jump_left : {
				frames : [ 13 ],
				rate : 1 / 10,
				flip : "x" },
			stand_right : {
				frames : [ 14 ],
				rate : 1 / 10,
				flip : false },
			stand_left : {
				frames : [ 14 ],
				rate : 1 / 10,
				flip : "x" },
			duck_right : {
				frames : [ 15 ],
				rate : 1 / 10,
				flip : false },
			duck_left : {
				frames : [ 15 ],
				rate : 1 / 10,
				flip : "x" },
			climb : {
				frames : [ 16, 17 ],
				rate : 1 / 3,
				flip : false } });
		var EnemyAnimations = {
			walk : {
				frames : [ 0, 1 ],
				rate : 1 / 3,
				loop : true },
			dead : {
				frames : [ 2 ],
				rate : 1 / 10 } };
		Q.animations("fly", EnemyAnimations);
		Q.animations("slime", EnemyAnimations);
		Q.animations("snail", EnemyAnimations);
		Q.stageScene("level1");
		Q.stageScene('hud', 3, Q('Player').first().p);

	}, {
		progressCallback : function(loaded, total) {
			var element = document.getElementById("loading_progress");
			element.style.width = Math.floor(loaded / total * 100) + "%";
			if (loaded == total) {
				document.getElementById("loading").remove();
			}
		} });
});