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
		maximize : true });
	// And turn on default input controls and touch input (for UI)
	Q.controls(true);
	// Enable touch
	Q.touch();
	// Enable sounds.
	Q.enableSound();

	/*******************************************************************************************************************
	 * Create the scene : level1
	 ******************************************************************************************************************/
	Q.scene("level1", function(stage) {
		Q.stageTMX("level1.tmx", stage);
		stage.add("viewport").centerOn(400, 820);
	});

	/*******************************************************************************************************************
	 * load tmx map
	 ******************************************************************************************************************/
	Q.loadTMX("level1.tmx", function() {
		Q.stageScene("level1");
	}, {
		progressCallback : function(loaded, total) {
			var element = document.getElementById("loading_progress");
			element.style.width = Math.floor(loaded / total * 100) + "%";
			if (loaded == total) {
				document.getElementById("loading").remove();
			}
		} });
});