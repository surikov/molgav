function App() {

	var me = this;

	this.mixer = new Mixer();
	this.compiler = new MidiCompiler();
	this.messages = [];
	this.song = new Song();
	this.position = null;
	this.cache = new Cache();
	this.renderer = new Renderer();
	this.select = new Select();
	this.audioBufferSourceNode = null;
	this.audioContext = null;
	this.playOn = false;
	//this.openedSlotId = null;
	this.instanceID = "";
	this.mixerMode=1;
	this.tapSizeMode=1;
	this.renderSlotStep=false;
	//this.storeExamples=new StoreExamples();
	this.init = function () {
		/*
		var aaa={
		saved:true,
		message:"dfsfbsgfb"
		};
		console.log(JSON.stringify(aaa));
		 */
		console.log("App.init");
		try {
			me.instanceID = 1.0 * readTexFromStorage("instanceID");
			if (me.instanceID < 1) {
				me.instanceID = randomKey();
				saveTexToStorage("instanceID", "" + me.instanceID);
			}
			console.log(me.instanceID);
			//me.readTexFromStorage
			//saveTexToStorage("mixRealTime", me.mixRealTime?"1":"0");
			app.mixerMode = readNumFromStorage("mixerMode",1,1,3);
			app.mixerMode=1;
			app.tapSizeMode = readNumFromStorage("tapSizeMode",1,2,3);
			calcTapSize(me.tapSizeMode);
			//me.mixerMode = (mx == "1");
			var t = readTexFromStorage("last");
			//console.log(t);
			var o = JSON.parse(t);
			if (o != null) {
				me.song = o;
//console.log("last",me.song);
				toolbox.adjustSamples(app.song);
				//console.log(me.song);
				//console.log("t.length " + t.length);
				//var compressed = LZString.compressToBase64(t);
				//console.log("compressed.length " + compressed.length);
				//console.log(compressed);
				/*
				var r1 = app.song.riffs[1];
				//toolbox.findRiffById(238335, app.song);
				var r2 = app.song.riffs[3];
				//toolbox.findRiffById(639294, app.song);
				for (var i = 0; i < r1.tunes[0].steps.length; i++) {
				var a1 = r1.tunes[0].steps[i][0];
				var a2 = r2.tunes[0].steps[i][0];
				console.log(a1.pitch + "/" + a1.length + " : " + a2.pitch + "/" + a2.length);
				if (r1.tunes[0].steps[i].length > 1) {
				a1 = r1.tunes[0].steps[i][1];
				a2 = r2.tunes[0].steps[i][1];
				console.log("	" + a1.pitch + "/" + a1.length + " : " + a2.pitch + "/" + a2.length);
				}
				}*/
				console.log("last",me.song);
			} else {
				console.log("can't load last");
			}
		} catch (e) {
			console.log(e);
		}
		me.renderer.init();

		me.renderer.layers[me.renderer.layers.length] = me.select;
		me.resize();
		me.renderer.loadSettings(me.song);
		var songPosition = toolbox.findPosition(app.song.selectedPositionId, app.song, true);
		if (songPosition != null) {
			me.showPosition(songPosition);
		} else {
			me.showSong();
		}
		me.renderer.fireRender();
		console.log("App.init done");
	};
	this.done = function () {
		console.log("App.done");
		me.blur();
	};
	this.resize = function () {
		console.log("App.resize " + window.innerWidth + "x" + window.innerHeight);
		me.renderer.onResize();
	};
	this.focus = function () {
		console.log("App.focus");
		me.renderer.fireRender();
	};
	this.blur = function () {
		console.log("App.blur");
		me.stopAudio5();
		me.renderer.saveSettings(me.song);
		if(app.song.samples){
			for(var i=0;i<app.song.samples.length;i++){
				try{
					app.song.samples[i].signed=null;
				}catch(e){
					console.log(e);
				}
			}
		}
		console.log(me.song);
		var saveText = JSON.stringify(me.song);
		saveTexToStorage("last", saveText);
		saveTexToStorage("mixerMode", ""+me.mixerMode );
		saveTexToStorage("tapSizeMode", ""+me.tapSizeMode );
		//console.log(saveText);
	};
	this.addMessage = function (msg) {
		if (me.messages.length > 1) {
			me.messages[2] = me.messages[1];
		}
		if (me.messages.length > 0) {
			me.messages[1] = me.messages[0];
		}
		me.messages[0] = msg;
	};

	this.___log = function (msg) {
		me.addMessage(msg);
		try {
			console.log(msg);
		} catch (e) {
			me.addMessage("log error: " + e);
		}
	};
	this.hidePrompt = function () {
		me.select.visibled = false;
		app.renderer.fireRender();
	};
	this.promptSelect = function (caption, list, callback) {
		console.log("promptSelect: " + caption);
		me.select.items = list;
		me.select.caption = caption;
		me.select.action = callback;
		me.select.visibled = true;
		app.renderer.fireRender();
	};
	this.promptConfirm = function (caption, callback) {
		var items = [];
		items[0] = new Item(lang.yes(), "", callback);
		items[1] = new Item(lang.cancel(), "");
		me.promptSelect(caption, items);
	};
	this.promptWarning = function (caption) {
		var items = [];
		//items[0] = new Item("Close", "");
		me.promptSelect(caption, items);
	};
	this.selectRiffIfNotSelected = function (slot) {
		if (app.song.selectedRiffId) {
			for (var i = 0; i < slot.riffIds.length; i++) {
				if (slot.riffIds[i] == app.song.selectedRiffId) {
					return app.song.selectedRiffId;
				}
			}
		}
		//console.log("----"+app.song.selectedRiffId);
		if (slot.riffIds.length > 0) {
			app.song.selectedRiffId = slot.riffIds[0];
			return app.song.selectedRiffId;
		}
		app.song.selectedRiffId = undefined;
		return app.song.selectedRiffId;
	}
	this.selectInstrumentIfNotSelected = function (riffId) {
		var r = toolbox.findRiffById(riffId, app.song);
		if(r){
			if (toolbox.existsSampleIdInRiff(app.song.selectedSampleId, r)) {
				return app.song.selectedSampleId;
			}
			if(r.tunes){
				if (r.tunes.length > 0) {
					app.song.selectedSampleId = r.tunes[0].sampleId; ;
					return app.song.selectedSampleId;
				}
			}
		}
		app.song.selectedSampleId = undefined;
		return app.song.selectedSampleId;
	}
	//me.mixRealTime = false;
	this.switchRealTimeMixing = function () {
		stopPlay();
		//me.mixRealTime = !me.mixRealTime;
		me.mixerMode++;
		if(me.mixerMode>3){
			me.mixerMode=1;
		}
	}
	this.switchTapSize = function () {
		me.tapSizeMode++;
		if(me.tapSizeMode>3){
			me.tapSizeMode=1;
		}
		calcTapSize(me.tapSizeMode);
		//me.renderer.fireRender();
	}
	this.showPosition = function (slot) {
		console.log("showPosition",slot);
		if (slot != null) {
			stopPlay();
			if(!slot.left){
				slot.left=0;
			}
			if(!slot.top){
				slot.top=0;
			}
			//me.slot = slot;
			//me.renderer.panelSong.visibled = false;
			//me.renderer.panelPosition.visibled = true;
			app.song.selectedPositionId = slot.id;

			me.renderer.panelSong.visibled = false;
			me.renderer.panelPosition.visibled = true;
			me.renderer.panelPosition.horizontal.visibled = true;
			me.renderer.panelPosition.keysBorder.visibled = true;
			me.renderer.panelPosition.panelBeat.visibled = true;
			me.renderer.panelPosition.panelMelody.visibled = true;
			me.renderer.panelPosition.panelKeys.visibled = true;
			var riffId = me.selectRiffIfNotSelected(slot);

			if (riffId) {
				me.selectInstrumentIfNotSelected(riffId);
				console.log("app.song.selectedSampleId " + app.song.selectedSampleId);
			}
			app.renderer.menuRiffs.refresh();
			app.renderer.menuSamples.refresh();

			//app.renderer.menuExamples.list.visibled = false;
			//app.renderer.menuExamples.vertical.visibled = false;
			//
			app.renderer.menuRiffs.list.visibled = true;
			app.renderer.menuRiffs.vertical.visibled = true;
			app.renderer.menuSamples.list.visibled = true;
			app.renderer.menuSamples.vertical.visibled = true;
			//console.log(app.renderer.menuExamples);


		} else {
			me.promptWarning("No selected position");
		}
	};
	this.playPosition = function (slot) {
		//var cuSong = toolbox.songFromPosition(slot, app.song);
		console.log("playPosition", app.song, slot);
		me.mixAndPlay(app.song, slot);
		/*console.log("playPosition");
		if (slot != null) {
		this.showFog();
		app.mixer.mixPosition(slot, app.song, function (signed) {
		//app.playAudioChrome(signed);
		app.playAudio5(signed);
		});
		} else {
		me.promptWarning("No selected position");
		}*/
	};
	this.countSongLen = function (song, sr) {
		var s16 = //app.mixer.pcm.sampleRate
			sr * (60.0 / 4.0) / song.tempo;
		if (me.lockedSlot != null) {
			return s16 * 1 * song.meter;
		} else {
			var len = 0;
			var p = toolbox.findOrCreatePositionXY(song, 0, 0);
			do {
				len++;
				p = toolbox.nextPosition(song, p.left, p.top);
				//console.log("countSongLen ", p);
			} while (p.left != 0 || p.top != 0);

			var all = s16 * len * song.meter;
			console.log("countSongLen ", s16, len, song.meter, all);
			return all;
		}
	};
	var countMix = 0;
	var countFull = 0;
	var countPart = 100000;
	//var countBuffer = [];
	buffers = [];
	//var countSong=null;
	var startMixing = 0;
	var startSending = 0;
	var doneSending = 0;
	me.mixedLength = 0;
	me.slotLength = 0;
	me.slotMapX = [];
	me.slotMapY = [];
	me.highIndex = 0;
	me.playStartTime = 0;
	me.lockedSlot = null;
	this.playedSlotChanged = function () {
		if (app.playOn) {
			var cuTime = new Date().getTime() - me.playStartTime;
			var fromStart = cuTime % me.mixedLength;
			var idx = Math.floor(fromStart / me.slotLength);
			if (idx != me.highIndex) {
				me.highIndex = idx;
				//console.log(app.highIndex);
				return true;
			} else {
				return false;
			}
		} else {
			return false;
		}
	};
	this.buildHighlightMap = function (length) {
		me.mixedLength = 1000 * length / app.mixer.mixSampleRate; //44100;
		me.slotLength = 1000 * (app.mixer.mixSong.meter * app.mixer.pcm.sampleRate * (60.0 / 4.0) / app.mixer.mixSong.tempo) / 44100;
		me.slotMapX = [];
		me.slotMapY = [];
		me.slotMapX[me.slotMapX.length] = 0;
		me.slotMapY[me.slotMapY.length] = 0;
		var p = toolbox.nextPosition(app.mixer.mixSong, 0, 0);
		while (!(p.left == 0 && p.top == 0)) {
			me.slotMapX[me.slotMapX.length] = p.left;
			me.slotMapY[me.slotMapY.length] = p.top;
			p = toolbox.nextPosition(app.mixer.mixSong, p.left, p.top);
		}
		//console.log(me.mixedLength, me.slotLength, me.slotMapX, me.slotMapY);
		me.highIndex = 0;
		me.playStartTime = new Date().getTime();
	};
	this.partMix = function () {
		//console.log("countBuffer.length",countBuffer.length,countMix);

		//countMix = countMix - countPart;
		if (countMix > countPart) {
			var pre = new Date().getTime();
			var signed = app.mixer.mixNext(countPart);
			countMix = countMix - countPart;
			//countBuffer = countBuffer.concat(signed);
			buffers[buffers.length] = signed;
			console.log("mixed part", (new Date().getTime() - pre) / 1000);
			window.setTimeout(me.partMix, 10);
			//console.log(new Date().getTime());
			app.promptWarning("mixing " + Math.round(100 - 100 * countMix / countFull) + "% - " //
				+app.mixer.mixSongPosition.left + ":" + app.mixer.mixSongPosition.top);

		} else {
			var signed = app.mixer.mixNext(countMix);
			//countBuffer = countBuffer.concat(signed);
			buffers[buffers.length] = signed;
			//console.log("countBuffer.length",countBuffer.length);
			app.promptWarning("Initialize sound");
			startSending = new Date().getTime();

			//app.playAudio5(countBuffer);
			app.playAudio5(buffers, app.mixer.mixSampleRate);
			var fullLen = 0;
			for (var i = 0; i < buffers.length; i++) {
				fullLen = fullLen + buffers[i].length;
			}
			//me.buildHighlightMap(countBuffer.length);
			me.buildHighlightMap(fullLen);
			doneSending = new Date().getTime();
			me.playOn = true;
			app.renderer.menuSlot.menuItemPlay.caption = "Stop";
			app.renderer.menuSlot.menuItemPlay.renderIcon = toolbox.iconPlayStop;
			app.hidePrompt();
			console.log("mixing", (startSending - startMixing) / 1000, "sending", (doneSending - startSending) / 1000);
		}
	};
	this.playSong = function (song) {
		//console.log("playSong ", song);
		me.mixAndPlay(song, null);
	}
	this.mixAndPlay = function (song, slot) {
		me.lockedSlot = slot;
		console.log("mixAndPlay ", song, slot);
		//return;
		var s = song;
		//this.showFog();
		//countSong=song;
		app.cache.all(s, function () { //
			app.promptWarning("mixing");
			var currentRate = 44100;
			countMix = me.countSongLen(s, currentRate);
			countFull = countMix;
			buffers = [];
			//countBuffer = [];
			app.mixer.mixReset(s, currentRate);
			//console.log("partMix "+countMix);
			startMixing = new Date().getTime();
			me.partMix();

			/*
			var sz = me.countSongLen(s);
			app.mixer.mixReset(s);
			var signed = app.mixer.mixNext(sz);
			console.log("signed",signed);
			 */
			/*try {
			//console.log("playSong",s);
			//var signed = app.mixer.mixWholeSong(s);
			////////////////////////////////////////////////////////////////////
			var sz = me.countSongLen(s);
			app.mixer.mixReset(s);
			//var t=app.mixer.pcm.sampleRate * (60.0 / 4.0) / s.tempo
			//console.log(t*64);
			var signed = app.mixer.mixNext(sz);

			////////////////////////////////////////////////////////////////////
			me.playOn = true;
			app.renderer.menuSlot.menuItemPlay.caption = "Stop";
			app.hidePrompt();
			app.playAudio5(signed);
			} catch (exp) {
			console.log(exp);
			app.promptWarning("Unknown error. Refresh page and try again.");
			}*/
		}, function () { //
			app.promptWarning("Can't cache waves");
		});
	};
	this.showSong = function () {
		console.log("showSong");
		app.song.selectedPositionId = null;
		stopPlay();

		me.renderer.panelSong.visibled = true;
		me.renderer.panelPosition.visibled = false;
		me.renderer.panelPosition.keysBorder.visibled = false;
		me.renderer.panelPosition.horizontal.visibled = false;
		me.renderer.panelPosition.panelBeat.visibled = false;
		me.renderer.panelPosition.panelMelody.visibled = false;
		me.renderer.panelPosition.panelKeys.visibled = false;
		//app.renderer.menuExamples.list.visibled = true;
		//app.renderer.menuExamples.vertical.visibled = true;
		//
		app.renderer.menuRiffs.list.visibled = false;
		app.renderer.menuRiffs.vertical.visibled = false;
		app.renderer.menuSamples.list.visibled = false;
		app.renderer.menuSamples.vertical.visibled = false;
		
		app.renderer.clearCache();

	};
	this.showFog = function () {
		console.log("showFog");
		var div = document.getElementById('playDiv');
		div.style.visibility = 'visible';
	};
	this.hideFog = function () {
		console.log("hideFog");
		var div = document.getElementById('playDiv');
		div.style.visibility = 'hidden';
	};
	this.playAudioChrome = function (signed) {
		console.log("start playAudioChrome");

		var data = app.mixer.unsigned(signed);
		var s = app.mixer.pcm.make(data);
		// window.open(s);
		console.log("seek audioID");
		var audioID = document.getElementById("playAudio");
		console.log("found " + audioID);
		audioID.pause();
		console.log("setup audioID");
		audioID.src = s;
		//console.log(s);
		console.log("play audioID");
		audioID.play();
		console.log("done playAudioChrome");
	};
	this.stopAudioTizen = function () {}
	this.playAudioTizen = function (signed) {
		console.log("start playAudioTizen");
		var audioContext = null;
		try {
			console.log("fix up for prefixing");
			window.AudioContext = window.AudioContext || window.webkitAudioContext;
			audioContext = new AudioContext();
		} catch (e) {
			console.log(e);
		}

		//var audioContext = new webkitAudioContext();
		var audioBuffer = audioContext.createBuffer(1, signed.length, 44100);
		var float32Array = audioBuffer.getChannelData(0);
		for (i = 0; i < float32Array.length; i++) {
			// float32Array[i] = Math.sin(2 * 180 * (i / float32Array.length));
			// // Two waveform oscillations
			float32Array[i] = signed[i] / 768.0;
		}
		console.log("Create source node");
		var audioBufferSourceNode = audioContext.createBufferSource();
		audioBufferSourceNode.loop = true; // Make sure that sound will repeat
		// over and over again
		audioBufferSourceNode.buffer = audioBuffer; // Assign our buffer to the
		// source node buffer
		console.log("Connect to the destination and play");
		audioBufferSourceNode.connect(audioContext.destination);
		audioBufferSourceNode.noteOn(0);
		console.log("done playAudioTizen");
	};
	this.stopAudio5 = function () {
		console.log("try this.stopAudio5");
		if (app.audioBufferSourceNode != null) {
			console.log("audioBufferSourceNode.stop");
			//app.audioBufferSourceNode.noteOff(0);
			try {
				app.audioBufferSourceNode.stop(0);
				app.audioBufferSourceNode.disconnect(0);
			} catch (ops) {
				console.log(ops);
			}
		}
	};
	me.testPlayOn = false;
	me.scriptProcessorNode = null;
	this.testPlay = function (fromPosition) {
		console.log("test play",fromPosition);
		if (me.testPlayOn) {
			me.testPlayStop();
			me.testPlayOn = false;
		} else {
			this.testPlayStart(fromPosition);
			me.testPlayOn = true;
			app.renderer.menuSlot.menuItemPlay.caption = "Stop";
			app.renderer.menuSlot.menuItemPlay.renderIcon = toolbox.iconPlayStop;
		}
	}

	this.testPlayStart = function (fromPosition) {
		app.cache.all(app.song, function () { //
			try {
				me.testPlayMix(fromPosition);
			} catch (exp) {
				console.log(exp);
				app.promptWarning("Unknown error. Refresh page and try again.");
			}
		}, function () { //
			console.log("Can't cache");
		});
	}
	/*
	this.copyAudioBuffer = function (output, signed) {
	for (var i = 0; i < output.length; i++) {
	output[i] = signed[i] / 128.0;
	}
	};*/
	me.scriptRatio = 1;
	me.markChanged = false;
	me.markBar = 0;
	this.testPlayMix = function (fromPosition) {
		console.log("render play");
		if (this.audioContext == null) {
			try {
				console.log("fix up for prefixing");
				window.AudioContext = window.AudioContext || window.webkitAudioContext;
				this.audioContext = new AudioContext();
			} catch (e) {
				console.log(e);
			}
		}
		console.log("fromPosition",fromPosition);
		if(fromPosition!=undefined){
			app.mixer.mixReset(app.song, 44100,fromPosition.left,fromPosition.top); //this.audioContext.sampleRate);
		}else{
			app.mixer.mixReset(app.song, 44100); //this.audioContext.sampleRate);
		}

		app.hidePrompt();
		//console.log(this.audioContext.sampleRate);
		me.scriptRatio = this.audioContext.sampleRate / app.mixer.mixSampleRate; //48000/22050~2
		me.scriptProcessorNode = this.audioContext.createScriptProcessor(1024 * 16, 1, 1);
		me.testPlayOn=true;
		me.scriptProcessorNode.onaudioprocess = function (audioProcessEvent) {
			if(!me.testPlayOn){
				console.log('done test');
			}
			var output = audioProcessEvent.outputBuffer.getChannelData(0);
			//console.log("onaudioprocess",app.mixer.mixSongPosition, app.mixer.mix16Counter);
			/*if(me.markBar!=app.mixer.mix16Counter+1){
			me.markChanged=true;
			me.markBar=app.mixer.mix16Counter+1;
			if(me.markBar>app.mixer.mixSong.meter){
			me.markBar=0;
			}
			}*/

			//n = new Date().getTime();
			var nStart = new Date().getTime();
			var signed = app.mixer.mixNext(output.length / me.scriptRatio);
			var nMixed = new Date().getTime();
			//me.copyAudioBuffer(output, signed);
			//console.log("mixed", signed.length, new Date().getTime() - n);
			//n = new Date().getTime();
			var le = output.length;
			for (var i = 0; i < le; i++) {
				output[i] = signed[~~(i / me.scriptRatio)] / 128.0;
			}
			var nSent = new Date().getTime();
			//console.log(output.length,signed.length,(nMixed-nStart),(nSent-nMixed));
			if (me.markBar != app.mixer.mix16Counter) {
				me.markChanged = true;
				me.markBar = app.mixer.mix16Counter;
			}
		};
		//me.scriptProcessorNode.connect(this.audioContext.destination);
		this.connectFilters();
		console.log("play stream");
	}
	this.testPlayStop = function () {
		console.log("stop test");
		try{
		//console.log(0,me.scriptProcessorNode);
		//console.log(22,me.scriptProcessorNode);
		//console.log(33,me.scriptProcessorNode.stop);
		//me.scriptProcessorNode.onaudioprocess = null;
		//console.log(1,me.scriptProcessorNode);
		//me.scriptProcessorNode.disconnect(0);
		//console.log(2,me.scriptProcessorNode);
			me.testPlayOn=false;
			this.disconnectFilters();
			me.scriptProcessorNode.onaudioprocess = null;
		}catch(e){
			console.log(e);
		}
	}
this.disconnectFilters=function(){
	console.log('disconnectFilters');

	//this.stopAudio5();
	//this.testPlayStop();
	me.scriptProcessorNode.disconnect();
	me.cabinet.disconnect();
	this.eq32.disconnect();
	this.eq63.disconnect();
	this.eq125.disconnect();
	this.eq250.disconnect();
	this.eq500.disconnect();
	this.eq1000.disconnect();
	this.eq2000.disconnect();
	this.eq4000.disconnect();
	this.eq8000.disconnect();
	this.eq16000.disconnect();
	this.eq16000.disconnect();
	//this.audioContext.destination
}
this.createEq=function(f){
		var r = this.audioContext.createBiquadFilter();
		r.type = "peaking";
		r.gain.value = 0;
		r.frequency.value = f;
		r.Q.value = 1;
		return r;
};
var cabinetImpulse = [
			0.21543064713478088, 0.5968216061592102, 0.912590742111206, 1.009040355682373, 0.9345616102218628, 0.801206111907959, 0.6011229753494263, 0.26208391785621643, -0.15228676795959473, -0.4350961744785309, -0.48666444420814514, -0.4288691282272339, -0.3704981207847595, -0.2561623454093933, -0.04052649438381195, 0.17862018942832947, 0.2724054753780365, 0.24724756181240082, 0.2167157530784607, 0.20630916953086853, 0.1514209359884262, 0.06955219060182571, 0.0402434803545475, 0.060467563569545746, 0.061958879232406616, 0.032873984426259995, 0.021819235756993294, 0.06011128053069115, 0.09806782752275467, 0.06384801119565964, -0.0015385178849101067, -0.027264418080449104, -0.03607996925711632, -0.07115244120359421, -0.1131587028503418, -0.12434571981430054, -0.10727634280920029, -0.08802803605794907, -0.081361323595047, -0.07060238718986511, -0.03427581116557121, 0.0165542121976614, 0.051248181611299515, 0.06536567211151123, 0.07843148708343506, 0.09632094204425812, 0.1042163223028183, 0.08259140700101852, 0.039928097277879715, -0.000016878602764336392, -0.04120249301195145, -0.08023693412542343, -0.08385323733091354, -0.05380384251475334, -0.026715470477938652, -0.015028324909508228, -0.01248881034553051, -0.01870650239288807, -0.023754261434078217, -0.016837626695632935, 0.00027974805561825633, 0.03090488724410534, 0.06972981989383698, 0.09138311445713043, 0.08398831635713577, 0.04752659425139427, -0.026607006788253784, -0.11458443850278854, -0.17355750501155853, -0.18816959857940674, -0.16167782247066498, -0.1138182133436203, -0.0625002309679985, -0.0023175477981567383, 0.05573539063334465, 0.08099162578582764, 0.0743165835738182, 0.05173585191369057, 0.017583470791578293, -0.020232556387782097, -0.04887932166457176, -0.06019516661763191, -0.04803912714123726, -0.022699838504195213, -0.007916916161775589, -0.006094999611377716, -0.005430098157376051, -0.006030711345374584, -0.010485637933015823, -0.013108702376484871, -0.011642907746136189, -0.007692738436162472, -0.009490063413977623, -0.023917309939861298, -0.0439474992454052, -0.059613678604364395, -0.0727449581027031, -0.0874256119132042, -0.09657616913318634, -0.0874454528093338, -0.05405423417687416, -0.009308633394539356, 0.029695535078644753, 0.05620267987251282, 0.07000041007995605, 0.06662970781326294, 0.039906397461891174, -0.005657647270709276, -0.05048786848783493, -0.07378202676773071, -0.07216660678386688, -0.05560455098748207, -0.031112220138311386, 0.004654848016798496, 0.046538323163986206, 0.0763992890715599, 0.08234427124261856, 0.06932748109102249, 0.04536190629005432, 0.012190708890557289, -0.026757802814245224, -0.059276893734931946, -0.07063663750886917, -0.06073087081313133, -0.04259337857365608, -0.024757644161581993, -0.007923992350697517, 0.0038201306015253067, 0.006704794708639383, 0.0006276994245126843, -0.010062245652079582, -0.02169060707092285, -0.03375179320573807, -0.045504357665777206, -0.052042849361896515, -0.04681602492928505, -0.0317591093480587, -0.011852407827973366, 0.009543869644403458, 0.03038186766207218, 0.04442504420876503, 0.046188805252313614, 0.03669305518269539, 0.021895622834563255, 0.006584728602319956, -0.008723045699298382, -0.022465411573648453, -0.029115084558725357, -0.02606464922428131, -0.018390463665127754, -0.007948294281959534, 0.006139181088656187, 0.02365432307124138, 0.04001886397600174, 0.05026216804981232, 0.05206458270549774, 0.04648716002702713, 0.03525657206773758, 0.020295828580856323, 0.007124812807887793, -0.0007859422476030886, -0.003528402652591467, -0.004326618276536465, -0.003223479725420475, 0.001898214453831315, 0.011344361118972301, 0.021089665591716766, 0.027267171069979668, 0.030684491619467735, 0.034853167831897736, 0.03793236240744591, 0.03687287122011185, 0.03426499292254448, 0.02986184135079384, 0.021451886743307114, 0.006213867571204901, -0.014579360373318195, -0.03657245635986328, -0.05428414046764374, -0.06528056412935257, -0.06960880756378174, -0.06619733572006226, -0.05323607102036476, -0.03208938241004944, -0.009560045786201954, 0.008747615851461887, 0.020191103219985962, 0.026018358767032623, 0.026448266580700874, 0.020869575440883636, 0.00883603934198618, -0.005096427630633116, -0.015290601179003716, -0.020192015916109085, -0.021057674661278725, -0.019490627571940422, -0.015410632826387882, -0.010093389078974724, -0.004010305739939213, 0.00048223097110167146, 0.0026107209268957376, 0.0028934648726135492, 0.0014824860263615847, -0.0022311166394501925, -0.007446200121194124, -0.011157603934407234, -0.009691177867352962, -0.0026775740552693605, 0.006318830884993076, 0.016671236604452133, 0.028856370598077774, 0.04094632342457771, 0.047701507806777954, 0.04683326184749603, 0.03889548033475876, 0.026584459468722343, 0.011334787122905254, -0.006133715622127056, -0.02312016487121582, -0.03626122698187828, -0.044013138860464096, -0.047411371022462845, -0.046604305505752563, -0.04210542514920235, -0.03351067006587982, -0.022980641573667526, -0.013227921910583973, -0.00561345973983407, 0.0006461172015406191, 0.005001382436603308, 0.004958947189152241, 0.00020787646644748747, -0.006511499173939228, -0.012609242461621761, -0.018038621172308922, -0.022384846583008766, -0.026645928621292114, -0.029441222548484802, -0.03070375882089138, -0.03207818791270256, -0.03373796120285988, -0.033664267510175705, -0.03123638592660427, -0.02786093018949032, -0.024137306958436966, -0.020027926191687584, -0.014925992116332054, -0.009408882819116116, -0.004254710860550404, -0.0015616693999618292, -0.0003241176309529692, 0.0005090478807687759, 0.0008944355067797005, -0.0002254969149362296, -0.003317910945042968, -0.008154000155627728, -0.014963667839765549, -0.02246604859828949, -0.029114725068211555, -0.032375480979681015, -0.03212503343820572, -0.029286976903676987, -0.025135193020105362, -0.02029402367770672, -0.016161171719431877, -0.01347831916064024, -0.012094123288989067, -0.011148608289659023, -0.01092602964490652, -0.012366020120680332, -0.014583750627934933, -0.016934849321842194, -0.016986113041639328, -0.014306334778666496, -0.009947847574949265, -0.005885828286409378, -0.0028604124672710896, -0.00166955532040447, -0.0031240142416208982, -0.0066781435161828995, -0.010771148838102818, -0.013623828068375587, -0.01503301877528429, -0.015533410012722015, -0.01602126844227314, -0.015237911604344845, -0.012613206170499325, -0.008412916213274002, -0.004656169563531876, -0.0019548600539565086, -0.0004186307196505368, -0.0002632643445394933, -0.001078148139640689, -0.003136928891763091, -0.005833863280713558, -0.00817201565951109, -0.009918177500367165, -0.012166693806648254, -0.014298240654170513, -0.01615956798195839, -0.016845442354679108, -0.016618898138403893, -0.015319762751460075, -0.013006903231143951, -0.011169347912073135, -0.01104626152664423, -0.013486696407198906, -0.017205964773893356, -0.020489372313022614, -0.02262824960052967, -0.024647511541843414, -0.025322768837213516, -0.02420748956501484, -0.021420037373900414, -0.01808883249759674, -0.01487987581640482, -0.011713198386132717, -0.0075867436826229095, -0.0014461097307503223, 0.004765826277434826, 0.011101474054157734, 0.017936162650585175, 0.02484249323606491, 0.030499249696731567, 0.033716827630996704, 0.03332783654332161, 0.030338775366544724, 0.025132428854703903, 0.01745148003101349, 0.008070390671491623, -0.0013380979653447866, -0.008722211234271526, -0.013296839781105518, -0.014733284711837769, -0.014595059677958488, -0.01235901191830635, -0.00832095555961132, -0.002855962608009577, 0.0034165852703154087, 0.008934847079217434, 0.013021393679082394, 0.01571965590119362, 0.016309615224599838, 0.014797830954194069, 0.011826683767139912, 0.007333396468311548, 0.0034922000486403704, 0.0002447538136038929, -0.002383120357990265, -0.005072775762528181, -0.007684432435780764, -0.009015006013214588, -0.009408456273376942, -0.009085617028176785, -0.007706624921411276, -0.004863137379288673, -0.0006994402501732111, 0.0037215487100183964, 0.0076995231211185455, 0.012335987761616707, 0.017019130289554596, 0.021243983879685402, 0.02323785610496998, 0.023657439276576042, 0.02411380410194397, 0.024499382823705673, 0.024237850680947304, 0.023478135466575623, 0.023719852790236473, 0.02487410232424736, 0.026960235089063644, 0.02916790544986725, 0.031412966549396515, 0.03221511095762253, 0.03025699220597744, 0.025351881980895996, 0.019108442589640617, 0.01321971882134676, 0.008099084720015526, 0.0049324617721140385, 0.005158879794180393, 0.009367605671286583, 0.01545126736164093, 0.021470027044415474, 0.026083439588546753, 0.028766999021172523, 0.028658799827098846, 0.026369886472821236, 0.02307923696935177, 0.020697418600320816, 0.01980249583721161, 0.019800569862127304, 0.02052113227546215, 0.021404724568128586, 0.022159064188599586, 0.02159978821873665, 0.02117772586643696, 0.02160928025841713, 0.02213750220835209, 0.0217842198908329, 0.021314255893230438, 0.02170047163963318, 0.023659775033593178, 0.025936657562851906, 0.02686470001935959, 0.02738819271326065, 0.028048396110534668, 0.029754197224974632, 0.03073766455054283, 0.030877292156219482, 0.031080391258001328, 0.03133474290370941, 0.03092869743704796, 0.029190879315137863, 0.02689928002655506, 0.02518794871866703, 0.024028057232499123, 0.022769413888454437, 0.021680595353245735, 0.021209388971328735, 0.02217874489724636, 0.024036550894379616, 0.026725517585873604, 0.028888223692774773, 0.029527070000767708, 0.027979440987110138, 0.0240374393761158, 0.018913162872195244, 0.013648840598762035, 0.008995386771857738, 0.00561821972951293, 0.004852965474128723, 0.007157151587307453, 0.011991658248007298, 0.017482029274106026, 0.02298426628112793, 0.02756546251475811, 0.031613342463970184, 0.034563709050416946, 0.03534603491425514, 0.03427572175860405, 0.03138532489538193, 0.028111211955547333, 0.02470341883599758, 0.021615495905280113, 0.019310377538204193, 0.017880117520689964, 0.017427345737814903, 0.018292605876922607, 0.019323579967021942, 0.019984086975455284, 0.02059226855635643, 0.021606795489788055, 0.023186566308140755, 0.024739105254411697, 0.02611706405878067, 0.026730723679065704, 0.02669014409184456, 0.025629781186580658, 0.02431567944586277, 0.022744080051779747, 0.020479783415794373, 0.01762154884636402, 0.01484072394669056, 0.012670980766415596, 0.011577125638723373, 0.011743986047804356, 0.012899884022772312, 0.015058006159961224, 0.01757703721523285, 0.020545795559883118, 0.023281874135136604, 0.026306649670004845, 0.02827739343047142, 0.028792761266231537, 0.0284836757928133, 0.026860522106289864, 0.024503735825419426, 0.02129681222140789, 0.01818491891026497, 0.016214769333600998, 0.015278742648661137, 0.014794239774346352, 0.014647534117102623, 0.014521394856274128, 0.01497400738298893, 0.015048091299831867, 0.014649317599833012, 0.01454203762114048, 0.015269934199750423, 0.01701710931956768, 0.018740246072411537, 0.020514754578471184, 0.022477958351373672, 0.024894319474697113, 0.02636157162487507, 0.026610717177391052, 0.025659842416644096, 0.023916520178318024, 0.02204001694917679, 0.02027026005089283, 0.01858575828373432, 0.016703076660633087, 0.015152250416576862, 0.013809406198561192, 0.012629716657102108, 0.010960012674331665, 0.008608912117779255, 0.006123064551502466, 0.00420666066929698, 0.002617286518216133, 0.002109742257744074, 0.002359414007514715, 0.0034437943249940872, 0.006111311260610819, 0.008973740972578526, 0.011518840678036213, 0.01297441590577364, 0.013642345555126667, 0.01496337354183197, 0.016785765066742897, 0.018189983442425728, 0.019928907975554466, 0.021299611777067184, 0.022269612178206444, 0.023118028417229652, 0.023365603759884834, 0.023188089951872826, 0.02258181758224964, 0.021343624219298363, 0.01886119320988655, 0.016527950763702393, 0.014604204334318638, 0.01343659870326519, 0.013131040148437023, 0.012633188627660275, 0.01186030637472868, 0.011492013931274414, 0.011381853371858597, 0.011943533085286617, 0.013400917872786522, 0.015176567249000072, 0.017601530998945236, 0.01965697668492794, 0.020918818190693855, 0.021229170262813568, 0.021227670833468437, 0.020709579810500145, 0.019577862694859505, 0.018399901688098907, 0.01717550866305828, 0.016039520502090454, 0.014947028830647469, 0.014207295142114162, 0.013959930278360844, 0.013774494640529156, 0.01288316585123539, 0.011520768515765667, 0.00958836730569601, 0.008349471725523472, 0.008004005067050457, 0.008273424580693245, 0.00913707260042429, 0.010169871151447296, 0.011512425728142262, 0.01322258822619915, 0.015106071718037128, 0.01675349846482277, 0.018983881920576096, 0.021157914772629738, 0.023190787062048912, 0.024281535297632217, 0.02411787584424019, 0.023879000917077065, 0.023799583315849304, 0.023732606321573257, 0.02359982207417488, 0.023311303928494453, 0.02295803092420101, 0.022652829065918922, 0.02173047512769699, 0.02036707103252411, 0.01839054562151432, 0.0169263556599617, 0.01598234847187996, 0.015275765210390091, 0.015207109972834587, 0.015659503638744354, 0.01683749072253704, 0.018287526443600655, 0.018939340487122536, 0.01845484972000122, 0.01803481951355934, 0.017686035484075546, 0.017736004665493965, 0.01794508472084999, 0.018100736662745476, 0.018460357561707497, 0.019061757251620293, 0.01909411884844303, 0.01845553331077099, 0.01756439357995987, 0.016640711575746536, 0.016287878155708313, 0.015974678099155426, 0.01616983488202095, 0.01652108132839203, 0.017075972631573677, 0.017725003883242607, 0.018328584730625153, 0.01859879307448864, 0.018393630161881447, 0.018152328208088875, 0.017780201509594917, 0.017523275688290596, 0.01695038564503193, 0.016107823699712753, 0.014828597195446491, 0.01346095371991396, 0.012626615352928638, 0.012123453430831432, 0.011739023961126804, 0.012173754163086414, 0.013171656988561153, 0.014738261699676514, 0.016374042257666588, 0.017482876777648926, 0.018487591296434402, 0.019241219386458397, 0.01993723399937153, 0.019945308566093445, 0.019486935809254646, 0.018450763076543808, 0.01743159629404545, 0.016388213261961937, 0.015265108086168766, 0.014344451017677784, 0.013353877700865269, 0.012590006925165653, 0.01183322723954916, 0.01138110738247633, 0.010991524904966354, 0.011145785450935364, 0.01162227988243103, 0.012387159280478954, 0.013465341180562973, 0.01415256503969431, 0.014540813863277435, 0.014842638745903969, 0.01497583743184805, 0.015172794461250305, 0.015254128724336624, 0.015174600295722485, 0.015161671675741673, 0.014955122955143452, 0.014953358098864555, 0.014415239915251732, 0.01371652353554964, 0.013073869980871677, 0.012675928883254528, 0.012205786071717739, 0.010953662917017937, 0.009703557938337326, 0.008400470949709415, 0.0070907617919147015, 0.005614303983747959, 0.00399211747571826, 0.0028318013064563274, 0.0023449338041245937, 0.001892397296614945, 0.0016293504741042852, 0.0014260754687711596, 0.0016792926471680403, 0.002481335075572133, 0.0033124203328043222, 0.004107580054551363, 0.004881458356976509, 0.0059921094216406345, 0.006947262678295374, 0.0077794683165848255, 0.008139584213495255, 0.008168037049472332, 0.00801029521971941, 0.007641770876944065, 0.006639445200562477, 0.005481263156980276, 0.004593227058649063, 0.003779152873903513, 0.003704094560816884, 0.0036095213145017624, 0.0036758154164999723, 0.003972520586103201, 0.0043353610672056675, 0.00501225795596838, 0.005699905566871166, 0.0064070215448737144, 0.007258421741425991, 0.007822658866643906, 0.008177590556442738, 0.007934465073049068, 0.007126898970454931, 0.006318606436252594, 0.005578884854912758, 0.005119682289659977, 0.004566395655274391, 0.0043058255687355995, 0.004098812583833933, 0.0043900227174162865, 0.004875325597822666, 0.00515600573271513, 0.005149120930582285, 0.0048681143671274185, 0.004986184649169445, 0.004895544610917568, 0.004720186349004507, 0.004221620503813028, 0.003589416155591607, 0.0030347078572958708, 0.002290945267304778, 0.0012738935183733702, 0.000310782139422372, -0.00037588702980428934, -0.0006495100678876042, -0.0007506556576117873, -0.0007555402698926628, -0.0006584118236787617, -0.0007202723063528538, -0.0003436738916207105, -0.00008188463834812865, 0.00011992516374448314, 0.0003234184405300766, 0.00046378682600334287, 0.0008167859050445259, 0.0011720213806256652, 0.001299970899708569, 0.0015005605528131127, 0.00163346529006958, 0.0017340650083497167, 0.002200270537286997, 0.0024142679758369923, 0.002646057400852442, 0.002830315614119172, 0.0031074476428329945, 0.003541199490427971, 0.0039541213773190975, 0.00418891804292798, 0.004249358084052801, 0.004441992845386267, 0.004687505308538675, 0.0046772886998951435, 0.004359186626970768, 0.004179010633379221, 0.003897064132615924, 0.003982380963861942, 0.004444570746272802, 0.004856145940721035, 0.005302333738654852, 0.005598870106041431, 0.005606310907751322, 0.0053276196122169495, 0.00448607886210084, 0.003321837866678834, 0.0022578281350433826, 0.0014632545644417405, 0.00116553227417171, 0.001070239464752376, 0.001274989452213049, 0.0015098018338903785, 0.0013849219540134072, 0.0007359600276686251, -0.00016652923659421504, -0.00119821319822222, -0.0017387457191944122, -0.001857258495874703, -0.0020216943230479956, -0.0014801501529291272, -0.0007014920702204108, 0.00006278433284023777, 0.0007342675817199051, 0.0009815434459596872, 0.001090519712306559, 0.0015014564851298928, 0.0018475191900506616, 0.0022566469851881266, 0.0025674132630228996, 0.002647989895194769, 0.0028317789547145367, 0.0026876532938331366, 0.0023158034309744835, 0.0016587504651397467, 0.0009811859345063567, 0.0005619326257146895, 0.00042020148248411715, 0.00014140714483801275, -0.0003501601458992809, -0.0009926443453878164, -0.0015243280213326216, -0.001688204356469214, -0.0014444824773818254, -0.0008679215679876506, -0.00017552345525473356, 0.0007929576677270234, 0.0017622277373448014, 0.002955969888716936, 0.0037032244727015495, 0.003968075383454561, 0.004155659582465887, 0.004199094604700804, 0.00388252642005682, 0.0029849661514163017, 0.002383091254159808, 0.0023920307867228985, 0.002808729186654091, 0.003671530168503523, 0.004778810776770115, 0.005765472073107958, 0.0069187963381409645, 0.007709179539233446, 0.008099487982690334, 0.008224641904234886, 0.007752975448966026, 0.007013326045125723, 0.006283430848270655, 0.005604949779808521, 0.005053934641182423, 0.0047821346670389175, 0.004711075220257044, 0.00490749254822731, 0.0053318035788834095, 0.005805234890431166, 0.0057732118293643, 0.005711518228054047, 0.0053523508831858635, 0.004587352741509676, 0.003965782932937145, 0.003174843732267618, 0.0026875415351241827, 0.0024147718213498592, 0.002023827750235796, 0.0016229357570409775, 0.0012612749123945832, 0.0009442834416404366, 0.00100702082272619, 0.0011898291995748878, 0.0016817698488011956, 0.002405939158052206, 0.003097693668678403, 0.0036436805967241526, 0.003751526353880763, 0.003728907322511077, 0.0034544679801911116, 0.003319082548841834, 0.0032604620791971684, 0.003225090680643916, 0.003307204693555832, 0.0037804460152983665, 0.004538693930953741, 0.005377302411943674, 0.00631408067420125, 0.007009519264101982, 0.007737479638308287, 0.00817260891199112, 0.008021706715226173, 0.007621052674949169, 0.00709929084405303, 0.006841753143817186, 0.007071401458233595, 0.006955174263566732, 0.006979983299970627, 0.007134930696338415, 0.007216953672468662, 0.007680959068238735, 0.007674100808799267, 0.007626682985574007, 0.007830965332686901, 0.007578921504318714, 0.007525190245360136, 0.007550046779215336, 0.006909883581101894, 0.006582202855497599, 0.006130857393145561, 0.005568686407059431, 0.005489404778927565, 0.005463678389787674, 0.005689429119229317, 0.006223639938980341, 0.0068840282037854195, 0.007481776177883148, 0.00801945012062788, 0.008092887699604034, 0.007790358737111092, 0.007188436109572649, 0.006594008766114712, 0.006100914906710386, 0.005805319640785456, 0.005965563002973795, 0.006277150474488735, 0.006958983838558197, 0.007964856922626495, 0.008860764093697071, 0.009537050500512123, 0.010060160420835018, 0.009914032183587551, 0.009419641457498074, 0.008611924014985561, 0.007563543505966663, 0.006794919725507498, 0.0060444301925599575, 0.005593912675976753, 0.005717646796256304, 0.0062563177198171616, 0.006834173575043678, 0.007201578933745623, 0.0073845344595611095, 0.007643272168934345, 0.007984527386724949, 0.008088839240372181, 0.007879854179918766, 0.0077146138064563274, 0.007583287078887224, 0.007419266737997532, 0.006916858721524477, 0.006169332657009363, 0.005764216184616089, 0.005425105337053537, 0.005352593492716551, 0.005366846919059753, 0.005144142080098391, 0.005156502593308687, 0.004966386593878269, 0.0044348761439323425, 0.004381120670586824, 0.004409103188663721, 0.00526434974744916, 0.006776796188205481, 0.008197384886443615, 0.010052028112113476, 0.011176991276443005, 0.011839274317026138, 0.012102543376386166, 0.01200910285115242, 0.011729279533028603, 0.010719996877014637, 0.009463089518249035, 0.008232560008764267, 0.007502677850425243, 0.007320786826312542, 0.007477460894733667, 0.008102511055767536, 0.009425369091331959, 0.010968389920890331, 0.011967563070356846, 0.012194694951176643, 0.011589610017836094, 0.010613023303449154, 0.009447392076253891, 0.00793096236884594, 0.006647375877946615, 0.005823659710586071, 0.005735725164413452, 0.006562649738043547, 0.007679290138185024, 0.009036938659846783, 0.01042928732931614, 0.011354620568454266, 0.011908311396837234, 0.012163960374891758, 0.011751074343919754, 0.011137016117572784, 0.010404868982732296, 0.010027408599853516, 0.010215177200734615, 0.00991208665072918, 0.009687679819762707, 0.00950705073773861, 0.009437819011509418, 0.009723471477627754, 0.009843580424785614, 0.01026991382241249, 0.011125528253614902, 0.012117594480514526, 0.01310840342193842, 0.014009472914040089, 0.014716126956045628, 0.01499140728265047, 0.01494104228913784, 0.014420831575989723, 0.013578644953668118, 0.012652751989662647, 0.011509435251355171, 0.010674403049051762, 0.010090630501508713, 0.00992405042052269, 0.010035603307187557, 0.010395843535661697, 0.011367681436240673, 0.012247451581060886, 0.01292894221842289, 0.01323037687689066, 0.01290128380060196 //
		, 0.012412846088409424, 0.011881769634783268, 0.011394902132451534, 0.011432386934757233, 0.011705550365149975, 0.012392738834023476, 0.013260241597890854, 0.013967094011604786, 0.014649388380348682, 0.015115051530301571, 0.01574135571718216, 0.016272755339741707, 0.016801325604319572, 0.017091937363147736, 0.016757505014538765, 0.016091907396912575, 0.015182072296738625, 0.014059804379940033, 0.0130093302577734, 0.012249546125531197, 0.012213101610541344, 0.012792995199561119, 0.013340847566723824, 0.013936218805611134, 0.014507493935525417, 0.015153603628277779, 0.015433823689818382, 0.015528528951108456, 0.015467364341020584, 0.015101905912160873, 0.014795813709497452, 0.014419583603739738, 0.014409510418772697, 0.01454454381018877, 0.014884287491440773, 0.015612313523888588, 0.016240378841757774, 0.0169378574937582, 0.017385484650731087, 0.017318177968263626, 0.017224146053195, 0.016599027439951897, 0.015667840838432312, 0.014761682599782944, 0.013656697236001492, 0.012647535651922226, 0.0118126654997468, 0.011388967745006084, 0.011465967632830143, 0.012147679924964905, 0.012951509095728397, 0.013766846619546413, 0.01469302736222744, 0.015411022119224072, 0.0160461887717247, 0.01648390293121338, 0.016418403014540672, 0.016036512330174446, 0.015596617013216019, 0.015028283931314945, 0.014333635568618774, 0.013646405190229416, 0.013122966513037682, 0.012871665880084038, 0.013126415200531483, 0.013603503815829754, 0.01422082632780075, 0.014844223856925964, 0.015500962734222412, 0.016078198328614235, 0.016460413113236427, 0.016773846000432968, 0.016550598666071892, 0.016360819339752197, 0.015961432829499245, 0.015173391439020634, 0.014628639444708824, 0.014172067865729332, 0.013878009282052517, 0.013878073543310165, 0.013811588287353516, 0.013744164258241653, 0.013631564565002918, 0.013356813229620457, 0.013204325921833515, 0.01301491353660822, 0.013034477829933167, 0.013102715834975243, 0.013048626482486725, 0.013078358955681324, 0.013383961282670498, 0.013674277812242508, 0.01391078531742096, 0.01440994068980217, 0.014821880497038364, 0.015075757168233395, 0.0150291183963418, 0.014662956818938255, 0.01412707008421421, 0.013535420410335064, 0.012635970488190651, 0.011714765802025795, 0.011141438968479633, 0.010654289275407791, 0.010486215353012085, 0.01059418823570013, 0.010696226730942726, 0.011277207173407078, 0.012242707423865795, 0.013126908801496029, 0.013838368467986584, 0.014153258875012398, 0.014305193908512592, 0.013981769792735577, 0.013416043482720852, 0.012842519208788872, 0.012167155742645264, 0.01166493073105812, 0.011473841033875942, 0.011618184857070446, 0.011956105008721352, 0.012568287551403046, 0.013004579581320286, 0.013487705029547215, 0.013944651931524277, 0.014032193459570408, 0.014076191000640392, 0.013954299502074718, 0.013562698848545551, 0.013230158016085625, 0.01292618177831173, 0.012486116029322147, 0.012189147993922234, 0.01213584840297699, 0.012635939754545689, 0.01313534565269947, 0.013425358571112156, 0.013903738930821419, 0.014152146875858307, 0.014466127380728722, 0.014428224414587021, 0.01370506826788187, 0.013289976865053177, 0.012941394001245499, 0.012569431215524673, 0.0121396379545331, 0.01167829055339098, 0.011942439712584019, 0.012580282986164093, 0.013235033489763737, 0.013615910895168781, 0.013795369304716587, 0.013826929032802582, 0.01355353370308876, 0.013018330559134483, 0.012481383979320526, 0.012285898439586163, 0.012179648503661156, 0.012094151228666306, 0.012122824788093567, 0.012541119009256363, 0.012963997200131416, 0.013264667242765427, 0.013537195511162281, 0.013911860063672066, 0.014572557993233204, 0.014749240130186081, 0.014565053395926952, 0.014359003864228725, 0.014215157367289066, 0.014263561926782131, 0.013914047740399837, 0.013337858952581882, 0.013253077864646912, 0.013631082139909267, 0.014026734977960587, 0.014183548279106617, 0.014400768093764782, 0.014576883055269718, 0.014850170351564884, 0.014911995269358158, 0.014455966651439667, 0.014247008599340916, 0.014077267609536648, 0.013879160396754742, 0.013734252192080021, 0.013564618304371834, 0.01358800195157528, 0.013566733337938786, 0.013305691070854664, 0.013168592005968094, 0.013194986619055271, 0.013434050604701042, 0.01373623963445425, 0.013892733491957188, 0.01429456751793623, 0.01452893577516079, 0.014416244812309742, 0.013845180161297321, 0.012914175167679787, 0.012104973196983337, 0.011274795979261398, 0.010466321371495724, 0.00997490156441927, 0.009912525303661823, 0.01015469804406166, 0.010517792776226997, 0.010824578814208508, 0.01118448469787836, 0.011524800211191177, 0.011692634783685207, 0.011777506209909916, 0.011597046628594398, 0.011357040144503117, 0.011138399131596088, 0.010467343963682652, 0.010010523721575737, 0.009701712056994438, 0.009179463610053062, 0.008964866399765015, 0.008885395713150501, 0.009159800596535206, 0.00961792841553688, 0.010011838749051094, 0.010343562811613083, 0.010590267367661, 0.010762288235127926, 0.010562464594841003, 0.010228768922388554, 0.009986278600990772, 0.009699761867523193, 0.009482546709477901, 0.009259922429919243, 0.009029233828186989, 0.00910810474306345, 0.009175288490951061, 0.009444848634302616, 0.009799780324101448, 0.01003597304224968, 0.010300484485924244, 0.010111347772181034, 0.01000223308801651, 0.010042624548077583, 0.010140898637473583, 0.010440485551953316, 0.010505711659789085, 0.010575580410659313, 0.010496056638658047, 0.010382856242358685, 0.010228248313069344, 0.009751665405929089, 0.009565906599164009, 0.00938502885401249, 0.009310073219239712, 0.009283332154154778, 0.009105559438467026, 0.009026946499943733, 0.008700757287442684, 0.008411834016442299, 0.00784752145409584, 0.007326927036046982, 0.007126570679247379, 0.006924489047378302, 0.0071752117946743965, 0.007424334064126015, 0.007733169011771679, 0.008243120275437832, 0.008460420183837414, 0.008755940943956375, 0.00901307724416256, 0.008982366882264614, 0.008806911297142506, 0.00837703701108694, 0.00798852276057005, 0.007536747958511114, 0.00696614058688283, 0.006489212159067392, 0.006346233654767275, 0.0066445874981582165, 0.006959556136280298, 0.006979146506637335, 0.00665844464674592, 0.0064283511601388454, 0.006281404756009579, 0.006058587692677975, 0.005857170559465885, 0.005637696944177151, 0.0054486822336912155, 0.005248318426311016, 0.005006600636988878, 0.004908635746687651, 0.004987711552530527, 0.005137220025062561, 0.005069238133728504, 0.004784014541655779, 0.004507753066718578, 0.00398490484803915, 0.003497990081086755, 0.00315344356931746, 0.0031796139664947987, 0.003487585112452507, 0.0034717696253210306, 0.0033888122998178005, 0.003326109144836664, 0.00350622134283185, 0.0037000984884798527, 0.0037626095581799746, 0.003949293401092291, 0.003895667614415288, 0.0037580702919512987, 0.003513262839987874, 0.0032416293397545815, 0.0032066095154732466, 0.0030652808491140604, 0.003158701118081808, 0.0037545065861195326, 0.00481851352378726, 0.0057361251674592495, 0.005820162128657103, 0.005611015949398279, 0.005549239926040173, 0.0057312422432005405, 0.005527210421860218, 0.004860243760049343, 0.004282800015062094, 0.003921201918274164, 0.004141994286328554, 0.004464016295969486, 0.004878038540482521, 0.005969424732029438, 0.007242430932819843, 0.008517526090145111, 0.009341172873973846, 0.00924844853579998, 0.008743077516555786, 0.0077638523653149605, 0.006453184876590967, 0.005033108871430159, 0.003793108044192195, 0.0031811834778636694, 0.0031813783571124077, 0.0039010769687592983, 0.005006244871765375, 0.0061169154942035675, 0.0068039256148040295, 0.006716156844049692, 0.00617636926472187, 0.005235009361058474, 0.003704615868628025, 0.001701893168501556, -0.0005080783739686012, -0.002113428432494402, -0.002723793499171734, -0.0025596877094358206, -0.0017805362585932016, -0.0006843429291620851, 0.000729061895981431, 0.0021497313864529133, 0.0031836130656301975, 0.0033087681513279676, 0.0022434100974351168, 0.000610697956290096, -0.0013592755421996117, -0.0033229843247681856, -0.0047263759188354015, -0.005759161431342363, -0.005965626798570156, -0.005142474081367254, -0.0037259776145219803, -0.0021157613955438137, -0.001130569726228714, -0.00040823366725817323, 0.00006468883657362312, 0.0003941055329050869, 0.0008047073497436941, 0.0005073107313364744, -0.000030237313694669865, -0.0005578917916864157, -0.0010490218410268426, -0.0010776841081678867, -0.0009596815216355026, -0.0006778578390367329, 0.00007186144648585469, 0.0012178391916677356, 0.0025709683541208506, 0.004076437093317509, 0.005590024404227734, 0.006470864173024893, 0.006784231401979923, 0.006614754442125559, 0.005967785604298115, 0.005532745737582445, 0.005094377789646387, 0.0046429866924881935, 0.004658310674130917, 0.004737512674182653, 0.00476499879732728, 0.0049448162317276, 0.004814527928829193, 0.004901107866317034, 0.005304482765495777, 0.005460107699036598, 0.005936520639806986, 0.0063781095668673515, 0.006620687432587147, 0.0066262767650187016, 0.0060614654794335365, 0.005227190908044577, 0.004141692537814379, 0.003308851271867752, 0.002886096714064479, 0.002735450863838196, 0.003139893990010023, 0.003685001516714692, 0.00401698611676693, 0.0042271362617611885, 0.00423698965460062, 0.00426843436434865, 0.0047109066508710384, 0.005403256043791771, 0.006550786551088095, 0.008142773061990738, 0.00960939098149538, 0.011059891432523727, 0.012023250572383404, 0.012141953222453594, 0.011235751211643219, 0.008755795657634735, 0.0050553190521895885, 0.00020434075850062072, -0.005329569336026907, -0.010194053873419762, -0.013633639551699162, -0.014548451639711857, -0.012522155418992043, -0.008561711758375168, -0.0030455163214355707, 0.0027793473564088345, 0.007436168380081654, 0.010537274181842804, 0.011352931149303913, 0.010044889524579048, 0.0073913699015975, 0.0036405660212039948, -0.0007170343887992203, -0.004877010360360146, -0.008550330065190792, -0.011188802309334278, -0.01259575691074133, -0.012816696427762508, -0.01139416079968214, -0.009195743128657341, -0.006657713558524847, -0.003983590751886368, -0.0016622395487502217, 0.0004850461846217513, 0.0014511989429593086, 0.00121109199244529, 0.0004552381578832865, -0.0009223476517945528, -0.002249782904982567, -0.00322528718970716, -0.003448309376835823, -0.002547504147514701, -0.0007742087473161519, 0.0014783745864406228, 0.0035463657695800066, 0.004867668263614178, 0.004968354478478432, 0.004018057603389025, 0.00248652882874012, 0.0009849804919213057, 0.00007966826524352655, -0.000019469356629997492, 0.0004891985445283353, 0.0014737911988049746, 0.002656186930835247, 0.0034695304930210114, 0.003842866513878107, 0.003711456200107932, 0.003457743674516678, 0.003412203397601843, 0.0035664206370711327, 0.004038712475448847, 0.004720110911875963, 0.004973366856575012, 0.004748934879899025, 0.0042039984837174416, 0.0032233186066150665, 0.0024940890725702047, 0.0018735071644186974, 0.0011394205503165722, 0.0007922023069113493, 0.0008719172328710556, 0.0014163162559270859, 0.0023518395610153675, 0.0034084178041666746, 0.004349309019744396, 0.0047156717628240585, 0.004423675127327442, 0.0034617814235389233, 0.0020741219632327557, 0.0008914608624763787, 0.00009569706162437797, -0.00007738446583971381, 0.00028482393827289343, 0.0008842726238071918, 0.001350083970464766, 0.0016136938938871026, 0.0017465953715145588, 0.001663515344262123, 0.0017947549931704998, 0.0020924548152834177, 0.0021935543045401573, 0.0023237853311002254, 0.0022673329804092646, 0.0015724782133474946, 0.0007042744546197355, -0.00018172642739955336, -0.0007303110905922949, -0.000419959076680243, 0.00037285941652953625, 0.0014732438139617443, 0.002541382098570466, 0.003225372638553381, 0.0033113497775048018, 0.0029500017408281565, 0.002518998458981514, 0.0019532586447894573, 0.0017245702911168337, 0.0017401166260242462, 0.0018367856973782182, 0.002232428640127182, 0.002508210251107812, 0.0028898322489112616, 0.0031823995523154736, 0.003140102606266737, 0.0032547018490731716, 0.003496068064123392, 0.003740378189831972, 0.0038447617553174496, 0.003847528714686632, 0.0038321649190038443, 0.00369443790987134, 0.0033678666222840548, 0.003026065416634083, 0.0027238023467361927, 0.0023623290471732616, 0.002223776187747717, 0.002216088119894266, 0.0023202463053166866, 0.002538147382438183, 0.002786851953715086, 0.0033315466716885567, 0.0039264727383852005, 0.004425765946507454, 0.004675170872360468, 0.004644646774977446, 0.004448204766958952, 0.003805271815508604, 0.003062805626541376, 0.0023384527303278446, 0.0017330879345536232, 0.0015174502041190863, 0.0014465636340901256, 0.0015171606792137027, 0.0016836861614137888, 0.0017887256108224392, 0.0017487392760813236, 0.001680344226770103, 0.0015162660274654627, 0.0014656998682767153, 0.00180426228325814, 0.0022254306823015213, 0.0029277957510203123, 0.0037256854120641947, 0.004296914208680391, 0.004738764837384224, 0.004701427184045315, 0.004322536755353212, 0.003712218953296542, 0.0028687105514109135, 0.0022475675214082003, 0.0016850612591952085, 0.0013638838427141309, 0.0015220599016174674, 0.0019569299183785915, 0.0027320864610373974, 0.0036124351900070906, 0.004505667369812727, 0.005304994061589241, 0.005686677526682615, 0.005537889432162046, 0.00518879434093833, 0.0046307360753417015, 0.003925326280295849, 0.0037136112805455923, 0.0035381605848670006, 0.0034842202439904213, 0.003910266328603029, 0.004218217916786671, 0.004589456599205732, 0.005025103222578764, 0.0051208361983299255, 0.004993602633476257, 0.004805011674761772, 0.004380928818136454, 0.003986455034464598, 0.003784528002142906, 0.0034296729136258364, 0.003221668768674135, 0.003073623636737466, 0.0030513007659465075, 0.003397309221327305, 0.0037330538034439087, 0.004082251340150833, 0.004306059330701828, 0.004479679279029369, 0.004455546848475933, 0.00390683114528656, 0.00329418433830142, 0.0026740706525743008, 0.002420394914224744, 0.0026929278392344713, 0.00288230087608099, 0.0033047646284103394, 0.0038144204299896955, 0.0039025719743222, 0.003936010412871838, 0.003630533814430237, 0.0030349947046488523, 0.0027655665762722492, 0.002462423872202635, 0.0022237978409975767, 0.0022701791021972895, 0.002346745692193508, 0.002617523306980729, 0.002745262114331126, 0.0026609175838530064, 0.002646411769092083, 0.002343765925616026, 0.0020540852565318346, 0.002063068561255932, 0.002130575943738222, 0.002514956519007683, 0.003059430280700326, 0.0034631979651749134, 0.0038214719388633966, 0.003951800987124443, 0.0037385765463113785, 0.003207040950655937, 0.0027390734758228064, 0.0022255058865994215, 0.0017232031095772982, 0.0016189906746149063, 0.0014750621048733592, 0.0017304137581959367, 0.002133177826181054, 0.002527008531615138, 0.0031764216255396605, 0.0035936268977820873, 0.004094433970749378, 0.004396325442939997, 0.004531043581664562, 0.0045782942324876785, 0.004269558470696211, 0.003984500654041767, 0.0035818801261484623, 0.0032541428226977587, 0.0031115696765482426, 0.0028840757440775633, 0.0030212034471333027, 0.0031825476326048374, 0.003321812953799963, 0.003627037862315774, 0.00354979420080781, 0.00361230899579823, 0.0035899814683943987, 0.0034443619661033154, 0.003689515870064497, 0.0037979288026690483, 0.0038350149989128113, 0.003871121210977435, 0.003747330280020833, 0.003595770336687565, 0.0035960066597908735, 0.003609640523791313, 0.0036399560049176216, 0.0038872200530022383, 0.003919849172234535, 0.0038564391434192657, 0.0038357710000127554, 0.0036394766066223383, 0.0035362644121050835, 0.0034025097265839577, 0.003185085952281952, 0.003137917025014758, 0.0031541939824819565, 0.0031280831899493933, 0.003187599591910839, 0.003268567379564047, 0.0033073739614337683, 0.0034046689979732037, 0.0035519003868103027, 0.0036603547632694244, 0.0037175877951085567, 0.003854026785120368, 0.0037620754446834326, 0.0036541521549224854, 0.0036983645986765623, 0.0035833243746310472, 0.0036747308913618326, 0.003839736571535468, 0.004090690519660711, 0.004525883123278618, 0.004719125106930733, 0.004855429753661156, 0.004903391003608704, 0.004665014799684286, 0.004448711406439543, 0.004073177929967642, 0.0036911240313202143, 0.0035396546591073275, 0.0033724738750606775, 0.0034479456953704357, 0.003667575540021062, 0.0038928312715142965, 0.0041901119984686375, 0.004473154898732901, 0.004506301134824753, 0.004388915374875069, 0.004314776510000229, 0.003959660418331623, 0.0038018084596842527, 0.0037354477681219578, 0.0034334715455770493, 0.003509165020659566, 0.0035486011765897274, 0.0034486493095755577, 0.0035498274955898523, 0.003478849772363901, 0.0034537988249212503, 0.003579140407964587, 0.0035735226701945066, 0.003612934146076441, 0.0036370365414768457, 0.003665999975055456, 0.0035910215228796005, 0.00341517711058259, 0.0034341595601290464, 0.00325314630754292, 0.003294011577963829, 0.0034851408563554287, 0.003233584575355053, 0.003230823902413249, 0.0030800977256149054, 0.0026985749136656523, 0.002659183694049716, 0.0023890994489192963, 0.002112569287419319, 0.002180662238970399, 0.002213628264144063, 0.002345734741538763, 0.00258060684427619, 0.0026515088975429535, 0.002719671931117773, 0.0027913590893149376, 0.0027095675468444824, 0.002666149288415909, 0.00261293794028461, 0.002445994643494487, 0.0024161781184375286, 0.0022663010749965906, 0.0021308823488652706, 0.0020744898356497288, 0.001875419053249061, 0.001892830478027463, 0.0016516546020284295, 0.0014571778010576963, 0.001362251816317439, 0.0010652649216353893, 0.0011790853459388018, 0.0011516333324834704, 0.0012670991709455848, 0.0015805341536179185, 0.0017885505221784115, 0.0022090435959398746, 0.002399461343884468, 0.002548342337831855, 0.0025593095924705267, 0.0024412262719124556, 0.0022646018769592047, 0.0019817687571048737, 0.0018445099703967571, 0.0016525143291801214, 0.00170049665030092, 0.0016851864056661725, 0.001669559278525412, 0.0018607575912028551, 0.0017741444753482938, 0.0019529784331098199, 0.002182088792324066, 0.0022599720396101475, 0.002565286820754409, 0.0026213587261736393, 0.0025952819269150496, 0.0026767051313072443, 0.0025406009517610073, 0.0023858880158513784, 0.0022297168616205454, 0.00205581565387547, 0.0019052453571930528, 0.0018749526934698224, 0.0019647718872874975, 0.0018552580149844289, 0.0020349211990833282, 0.002229001373052597, 0.0021600762847810984, 0.0023720422759652138, 0.0023593909572809935, 0.002295572077855468, 0.0024066201876848936, 0.0023086778819561005, 0.002212274121120572, 0.002159703290089965, 0.0019509524572640657, 0.0017122593708336353, 0.0016697305254638195, 0.0015934944385662675, 0.0015826878370717168, 0.0017203952884301543, 0.0017866553971543908, 0.0019190401071682572, 0.002013672608882189, 0.001925884047523141, 0.0017837643390521407, 0.001600378891453147, 0.0014059290988370776, 0.0012858263216912746, 0.0011078733950853348, 0.0010809071827679873, 0.001163580804131925, 0.0011431947350502014, 0.0013023820938542485, 0.001408495125360787, 0.001413727062754333, 0.0015169313410297036, 0.0015990567626431584, 0.001626363256946206, 0.0016389981610700488, 0.0016043479554355145, 0.0014789553824812174, 0.0014661768218502402, 0.0013657783856615424, 0.0012610855046659708, 0.001355151180177927, 0.0013420428149402142, 0.0013873787829652429, 0.0014193785609677434, 0.0014290717663243413, 0.0014307141536846757, 0.0014190947404131293, 0.0013911114074289799, 0.001236982992850244, 0.0012818017276003957, 0.0012572372797876596, 0.0012878396082669497, 0.0013311628717929125, 0.0012968098744750023, 0.001496048062108457, 0.001552770147100091, 0.0015596277080476284, 0.0016602810937911272, 0.0016984452959150076, 0.0016573044704273343, 0.0017007780261337757, 0.0016286155441775918, 0.0015325117856264114, 0.0015684677055105567, 0.001473617390729487, 0.0014130428899079561, 0.00141138827893883, 0.0013640552060678601, 0.0012739542871713638, 0.0012688601855188608, 0.0012069486547261477, 0.0012043587630614638, 0.0012561905896291137, 0.001184329972602427, 0.0012173845898360014, 0.0011891932226717472, 0.0012418186524882913, 0.0011815129546448588, 0.0011010760208591819, 0.0011639953590929508, 0.0010174071649089456, 0.001118669519200921, 0.0010877975728362799, 0.0009390687337145209, 0.0009270430891774595, 0.0007580534438602626, 0.0008157776319421828, 0.0007608722080476582, 0.000731595850083977, 0.0007662322022952139, 0.0005747482064180076, 0.0005956249660812318, 0.0004872815334238112, 0.0003062747127842158, 0.0002412889152765274, 0.0002215852146036923, 0.0002788079436868429, 0.00027078730636276305, 0.00042486729216761887, 0.00047206159797497094, 0.0005310976994223893, 0.0007640847470611334, 0.0008464898564852774, 0.0009724320843815804, 0.0011020833626389503, 0.0011099466355517507, 0.0009462819434702396, 0.0007360427989624441, 0.00047649501357227564, 0.00020863588724751025, 0.00010495850438019261, -0.000023991597117856145, 0.00006606688111787662, 0.0001810896792449057, 0.0001817229058360681, 0.0003182019863743335, 0.0002247150696348399, 0.0002596426638774574, 0.0003827809705398977, 0.00031637022038921714, 0.00047066513798199594, 0.000469747930765152, 0.0004577196959871799, 0.0004358267760835588, 0.0002509938203729689, 0.00021791848121210933, 0.000010781488526845351, 0.000023965581931406632, -0.000002906528834500932, -0.00010011948324972764, 0.00009983363997889683, 0.000001128331291511131, 0.00009032255184138194, 0.00017235599807463586, 0.00009351316111860797, 0.00026010372675955296, 0.00021124863997101784, 0.00017325997760053724, 0.0002445185964461416, 0.0001269610511371866, 0.00025811270461417735, 0.0003537570883054286, 0.00028113005100749433, 0.00041845726082101464, 0.00032426632242277265, 0.0003459929139353335, 0.0003459471627138555, 0.00023384644009638578, 0.0003321077674627304, 0.00021345657296478748, 0.00026774953585118055, 0.00025542726507410407, 0.00018380470282863826, 0.00040042566251941025, 0.00034106624661944807, 0.00046647037379443645, 0.00064715655753389, 0.0005262511549517512, 0.0006501885945908725, 0.0006337449885904789, 0.0005370753351598978, 0.0005602843593806028, 0.0003937570727430284, 0.00032488195574842393, 0.0002918272220995277, 0.00020553648937493563, 0.00017958642274606973, 0.00009813827637117356, 0.000008372976481041405, -0.000057320150517625734, -0.0000216558273677947, 0.0000147614964589593, -0.00001325852736044908, 0.00012977571168448776, 0.00021425793238449842, 0.0002037436788668856, 0.00037602538941428065, 0.0004294032696634531, 0.0003860184515360743, 0.0005059731774963439, 0.00039649842074140906, 0.00026597807300277054, 0.0002995587419718504, 0.00011269236711086705, 0.00000147554817431228 //
		, 0.000016443167623947375, -0.00003407561962376349, -0.00005273898568702862, 0.00007563901453977451, 0.00006271440361160785, 0.00005105325544718653, 0.00014747577370144427, 0.000028352655135677196, 0.00015006570902187377, 0.00007996612839633599, 0.00004943599924445152, 0.00025472790002822876, 0.00010100463259732351, 0.00020899632363580167, 0.00015609159891027957, 0.00002092659633490257, 0.00009445635078009218, -0.000011896834621438757, 0.000004741103566630045, -0.00006463228055508807, -0.0001333757973043248, -0.0001847890525823459, -0.0002513438230380416, -0.00023702302132733166, -0.00038303466862998903, -0.00037701710243709385, -0.00031067620147950947, -0.000296302285278216, -0.000026792817152454518, 0.00005725225491914898, 0.0001039490889525041, 0.0003046135825570673, 0.0001957686326932162, 0.00017764864605851471, 0.00013666940503753722, -0.00003552396083250642, -0.000003554727754817577, -0.0000299124549201224, -0.00004520211223280057, 0.000002159246832889039, 0.00007056313188513741, 0.00005591469016508199, 0.0001015309535432607, 0.00022127926058601588, 0.00011247194197494537, 0.00021095969714224339, 0.00016735993267502636, -0.000048102974687935784, 0.00007062359509291127, -0.00009568708628648892, -0.0001804609055398032, -0.00011775188613682985, -0.0002559250278864056, -0.00007072336302371696, 0.000021769537852378562, 0.00008256341970991343, 0.0003065279743168503, 0.0003318350645713508, 0.0003853626549243927, 0.00039483944419771433, 0.0004149565938860178, 0.00032722382456995547, 0.00023680870071984828, 0.00021660416678059846, 0.0000685889899614267, 0.00015701152733527124, -0.000016330488506355323, -0.00002005070746236015, 0.00008248546510003507, -0.00007792981341481209, 0.00020276950090192258, 0.00015292881289497018, 0.00012754343333654106, 0.00027759026852436364, 0.00018318294314667583, 0.00016299284470733255, 0.00010094359458889812, 0.000058865723985945806, 0.000002594048964965623, 0.00003903829929186031, 0.000046174038288882, 0.00007909060514066368, 0.00012273895845282823, 0.00009757888619787991, 0.00013255261001177132, 0.00011674823326757178, 0.0001310874504270032, 0.00008483991405228153, 0.00002180447700084187, 0.000024236596800619736, 0.0000017055874650395708, -0.000006383335403370438, 0.000006840114565420663, 0.000025644250854384154, -0.00004047592301503755, -0.00008400051592616364, 0.0000030356998195202323, -0.00005431680619949475, -0.00010562714305706322, 0.0000019930726011807565, -0.00005882163532078266, -0.00004040663770865649, 0.000041544637497281656, -0.000053374718845589086, -0.00004876630919170566, -0.00006780691182939336, -0.00009301674435846508, -0.000004693175924330717, -0.00009159332694252953, -0.00008364747191080824, -0.0000128614319692133, -0.00021310822921805084, -0.00016931007849052548, -0.00013953016605228186, -0.0002648105437401682, -0.00015257885388564318, -0.00009655269968789071, -0.0000871247029863298, -0.000013048580512986518, 0.0000139726198540302, 0.0000029010939215368126, 0.00006042142922524363, -0.00003639016722445376, -0.00006372696225298569, -0.000001922818455568631, -0.00020918996597174555, -0.0001450410345569253, -0.00006247487908694893, -0.0002372680464759469, -0.0001366327633149922, -0.0000966571387834847, -0.00017797019972931594, -0.00006262780516408384, -0.00009402752766618505, -0.00016626647266093642, -0.00009953269182005897, -0.0001304188626818359, -0.0001278262643609196, -0.00009818274702411145, -0.00011750443809432909, -0.000009857811164692976, -0.00008461871038889512, -0.00010569883306743577, 0.00001085805160983, -0.00011621668090810999, -0.00002944252446468454, -0.000044263761083129793, -0.00010271128121530637, -0.000014649805962108076, -0.00009419941488886252, -0.00005971280188532546, -0.00005979196430416778, -0.000010148820365429856, -0.000027335041522746906, -0.0000617482146481052, 0.00002283337562403176, -0.00006315900827758014, -0.00004418776370584965, 0.000002149694410036318, -0.000034120792406611145, -0.00006459573341999203, -1.7087232606627367e-7, -0.000018552917026681826, -0.00007125300908228382, 0.000039345606637652963, -0.000048369791329605505, -0.00001353240259049926, 0.00004371571048977785, -0.000035690234653884545, 0.00004885479575023055, -0.0000148163862832007 //
		];
this.connectFilters=function(){
	console.log('connectFilters');
	/*if(me.testPlayOn){
		console.log('can not connect');
		return;
	}*/
	if(this.cabinet){
		//
	}else{
		/*
		this.compressorMaster=this.audioContext.createDynamicsCompressor();
		this.compressorMaster.threshold.value = -50;//-24;
		this.compressorMaster.knee.value = 40;//30;
		this.compressorMaster.ratio.value = 12;
		this.compressorMaster.reduction.value = -20;//0;
		this.compressorMaster.attack.value = 0.003;
		this.compressorMaster.release.value = 0.25;
		*/
		this.cabinet=this.audioContext.createConvolver();
		var audioBuffer = this.audioContext.createBuffer(1, cabinetImpulse.length, this.audioContext.sampleRate);
		var data = audioBuffer.getChannelData(0);
		for(var i=0;i<cabinetImpulse.length;i++){
				data[i] = cabinetImpulse[i];;
			}
		this.cabinet.buffer = audioBuffer;
		//
		this.eq32 = this.createEq(32);
		this.eq63 = this.createEq(63);
		this.eq125 = this.createEq(125);
		this.eq250 = this.createEq(250);
		this.eq500 = this.createEq(500);
		this.eq1000 = this.createEq(1000);
		this.eq2000 = this.createEq(2000);
		this.eq4000 = this.createEq(4000);
		this.eq8000 = this.createEq(8000);
		this.eq16000 = this.createEq(16000);
	}
	console.log(this.song.equalizer);
	if(this.song.equalizer){
		//this.scriptProcessorNode.connect(this.eq63);
		this.scriptProcessorNode.connect(this.cabinet);
		this.cabinet.connect(this.eq32);
		this.eq32.connect(this.eq63);
		this.eq63.connect(this.eq125);
		this.eq125.connect(this.eq250);
		this.eq250.connect(this.eq500);
		this.eq500.connect(this.eq1000);
		this.eq1000.connect(this.eq2000);
		this.eq2000.connect(this.eq4000);
		this.eq4000.connect(this.eq8000);
		this.eq8000.connect(this.eq16000);
		this.eq16000.connect(this.audioContext.destination);
		
			
			
		if(this.song.equalizer==1){
			this.eq32.gain.value = 0;
			this.eq63.gain.value = 2;
			this.eq125.gain.value = 3;
			this.eq250.gain.value = 4;
			this.eq500.gain.value = 2;
			this.eq1000.gain.value = 4;
			this.eq2000.gain.value = 6;
			this.eq4000.gain.value = 7;
			this.eq8000.gain.value = 5;
			this.eq16000.gain.value = -5;
		}else{
				this.eq32.gain.value = 6;
				this.eq63.gain.value = 5;
				this.eq125.gain.value = 5;
				this.eq250.gain.value = -2;
				this.eq500.gain.value = -6;
				this.eq1000.gain.value = 4;
				this.eq2000.gain.value = 10;
				this.eq4000.gain.value = 3;
				this.eq8000.gain.value = -2;
				this.eq16000.gain.value = -10;
		}
	}else{
		//this.scriptProcessorNode.connect(this.audioContext.destination);
		this.scriptProcessorNode.connect(this.cabinet);
		this.cabinet.connect(this.audioContext.destination);
	}
	//this.scriptProcessorNode.connect(this.compressorMaster);
	//this.compressorMaster.connect(this.audioContext.destination);
	//this.scriptProcessorNode.connect(this.audioContext.destination);
}
	//this.playAudio5 = function (signed) {
	this.playAudio5 = function (buffers, mixSampleRate) {
		console.log("start playAudio5");
		//var div = document.getElementById('playDiv');
		//div.style.visibility = 'visible';

		this.stopAudio5();
		if (this.audioContext == null) {
			try {
				console.log("fix up for prefixing");
				window.AudioContext = window.AudioContext || window.webkitAudioContext;
				this.audioContext = new AudioContext();
			} catch (e) {
				console.log(e);
			}
		}
		this.audioBufferSourceNode = this.audioContext.createBufferSource();
		//console.log("1");
		//console.log(this.audioContext.destination);
		this.audioBufferSourceNode.connect(this.audioContext.destination);
		/*
		var gainNode = this.audioContext.createGain();
		this.audioBufferSourceNode.connect(gainNode);
		gainNode.connect(this.audioContext.destination);
		 */
		//console.log("song length "+signed.length/44100);

		this.audioBufferSourceNode.loop = true; // Make sure that sound will repeat
		signed = [];
		for (var i = 0; i < buffers.length; i++) {
			signed = signed.concat(buffers[i]);
		}

		var audioBuffer = this.audioContext.createBuffer(1, signed.length, mixSampleRate);
		var float32Array = audioBuffer.getChannelData(0);
		for (i = 0; i < float32Array.length; i++) {
			float32Array[i] = signed[i] / 768.0;
		}
		//console.log("send", signed);
		this.audioBufferSourceNode.buffer = audioBuffer; // Assign our buffer to the
		//this.audioBufferSourceNode.noteOn(0);
		this.audioBufferSourceNode.start();
		console.log("done playAudio5");
	};
	this.doTestSample = function (sample, f32, fre, loopStart, loopEnd) {
		var audioBufferSourceNode = me.audioContext.createBufferSource();
		audioBufferSourceNode.connect(me.audioContext.destination);

		//var fre=44100.0;
		if (loopStart != 0 && loopEnd != 0) {
			audioBufferSourceNode.loop = true;
			audioBufferSourceNode.loopStart = sample.loopStart / fre;
			audioBufferSourceNode.loopEnd = sample.loopEnd / fre;
		}
		var audioBuffer = me.audioContext.createBuffer(1, f32.length, fre);
		var float32Array = audioBuffer.getChannelData(0);
		for (i = 0; i < float32Array.length; i++) {
			float32Array[i] = f32[i];
		}
		//loopEnd: 17523loopStart: 17100
		audioBufferSourceNode.buffer = audioBuffer;
		return audioBufferSourceNode;
	};
	//me.nextPosition=null;
	me.tick16 = 0;
	me.song16 = 0;
	me.position16 = null;
	me.play16on = false;
	me.drums16 = [];
	me.instruments16 = [];
	me.c16 = 0;
	me.ticker16 = null;
	this.decay16 = function () {}
	this.add16 = function () {
		console.log(me.c16, me.position16.left, "x", me.position16.top, ":", me.tick16);
		for (var r = 0; r < me.position16.riffIds.length; r++) {
			var songRiff = toolbox.findRiffById(me.position16.riffIds[r], me.song16);
			var chord = songRiff.beat[me.tick16];
			if (chord != null) {
				for (var i = 0; i < chord.length; i++) {
					var songRiffBeatPoint = chord[i];
					me.drum16(toolbox.findSampleById(songRiffBeatPoint.sampleId, me.song16));
				}
			}
			for (var t = 0; t < songRiff.tunes.length; t++) {
				var songRiffTune = songRiff.tunes[t];
				var chord = songRiffTune.steps[me.tick16];
				if (chord != null) {
					for (var i = 0; i < chord.length; i++) {
						var songRiffTunePoint = chord[i];
						var songSample = toolbox.findSampleById(songRiffTune.sampleId, me.song16);
						this.instrument16(songSample, songRiffTunePoint);
					}
				}
			}
		}
		me.c16++;
	}
	this.drum16 = function (sample) {
		console.log("drum16", sample);
		var audioBufferSourceNode = me.audioContext.createBufferSource();
		audioBufferSourceNode.connect(me.audioContext.destination);
		var f32 = app.cache.find32Buffer(sample.path);
		var audioBuffer = me.audioContext.createBuffer(1, f32.length, 44100);
		var float32Array = audioBuffer.getChannelData(0);
		/*console.log(float32Array.length);
		console.log(float32Array.push);
		console.log(float32Array);*/
		float32Array.set(f32);
		/*for (i = 0; i < float32Array.length; i++) {
		float32Array[i] = f32[i];
		}*/
		audioBufferSourceNode.buffer = audioBuffer;
		audioBufferSourceNode.start();
	}
	this.instrument16 = function (sample, songRiffTunePoint) {
		console.log("instrument16", sample, songRiffTunePoint);
	}
	this.moveNext16 = function () {
		me.add16();
		me.tick16++;
		if (me.tick16 >= me.song16.meter) {
			me.tick16 = 0;
			me.position16 = toolbox.nextPosition(me.song16, me.position16.left, me.position16.top);
		}
	};
	this.resetNext16 = function (song) {
		me.song16 = song;

		me.position16 = toolbox.findOrCreatePositionXY(me.song16, 0, 0);
		me.tick16 = 0;
		me.drums16 = [];
		me.instruments16 = [];
		me.c16 = 0;
	};
	this.playBuffer = function (song) {
		if (this.audioContext == null) {
			try {
				console.log("fix up for prefixing");
				window.AudioContext = window.AudioContext || window.webkitAudioContext;
				this.audioContext = new AudioContext();
			} catch (e) {
				console.log(e);
			}
		}
		app.cache.all(song, function () { //
			me.play16on = true;
			me.resetNext16(song);
			var d16 = (60000 / 4) / song.tempo;
			me.ticker16 = new Ticker(d16, me.moveNext16);
			me.ticker16.start();
		}, function () { //
			console.log("Can't cache");
		});

		/*
		for (var i = 0; i < 999; i++) {
		me.moveNext16();
		}
		 */
		/*
		app.cache.all(song, function () { //
		console.log("playBuffer",song);
		me.hidePrompt();
		var sample=app.song.samples[2];
		var fre=44100.0;
		var f32=app.cache.find32Buffer(sample.path);
		window.AudioContext = window.AudioContext || window.webkitAudioContext;
		me.audioContext = new AudioContext();
		var s2=me.doTestSample(sample,f32,fre,sample.loopStart/fre,sample.loopEnd/fre);
		fre=44100.0*2;
		var s2a=me.doTestSample(sample,f32,fre,0,0);
		fre=44100.0/2;
		var s2b=me.doTestSample(sample,f32,fre,0,0);
		s2.start();
		s2a.start();
		s2b.start();
		}, function () { //
		console.log("Can't cache");
		});*/
	};
	this.stopBuffer = function () {
		me.play16on = false;
		if (me.ticker16) {
			me.ticker16.stop();
		}
	}
	return this;
}
// Copyright (c) 2013 Pieroxy <pieroxy@pieroxy.net>
// This work is free. You can redistribute it and/or modify it
// under the terms of the WTFPL, Version 2
// For more information see LICENSE.txt or http://www.wtfpl.net/
//
// This lib is part of the lz-string project.
// For more information, the home page:
// http://pieroxy.net/blog/pages/lz-string/index.html
//
// Base64 compression / decompression for already compressed content (gif, png, jpg, mp3, ...) 
// version 1.1.0
var Base64String = {
  
  compressToUTF16 : function (input) {
    var output = "",
        i,c,
        current,
        status = 0;
    
    input = this.compress(input);
    
    for (i=0 ; i<input.length ; i++) {
      c = input.charCodeAt(i);
      switch (status++) {
        case 0:
          output += String.fromCharCode((c >> 1)+32);
          current = (c & 1) << 14;
          break;
        case 1:
          output += String.fromCharCode((current + (c >> 2))+32);
          current = (c & 3) << 13;
          break;
        case 2:
          output += String.fromCharCode((current + (c >> 3))+32);
          current = (c & 7) << 12;
          break;
        case 3:
          output += String.fromCharCode((current + (c >> 4))+32);
          current = (c & 15) << 11;
          break;
        case 4:
          output += String.fromCharCode((current + (c >> 5))+32);
          current = (c & 31) << 10;
          break;
        case 5:
          output += String.fromCharCode((current + (c >> 6))+32);
          current = (c & 63) << 9;
          break;
        case 6:
          output += String.fromCharCode((current + (c >> 7))+32);
          current = (c & 127) << 8;
          break;
        case 7:
          output += String.fromCharCode((current + (c >> 8))+32);
          current = (c & 255) << 7;
          break;
        case 8:
          output += String.fromCharCode((current + (c >> 9))+32);
          current = (c & 511) << 6;
          break;
        case 9:
          output += String.fromCharCode((current + (c >> 10))+32);
          current = (c & 1023) << 5;
          break;
        case 10:
          output += String.fromCharCode((current + (c >> 11))+32);
          current = (c & 2047) << 4;
          break;
        case 11:
          output += String.fromCharCode((current + (c >> 12))+32);
          current = (c & 4095) << 3;
          break;
        case 12:
          output += String.fromCharCode((current + (c >> 13))+32);
          current = (c & 8191) << 2;
          break;
        case 13:
          output += String.fromCharCode((current + (c >> 14))+32);
          current = (c & 16383) << 1;
          break;
        case 14:
          output += String.fromCharCode((current + (c >> 15))+32, (c & 32767)+32);
          status = 0;
          break;
      }
    }
    
    return output + String.fromCharCode(current + 32);
  },
  

  decompressFromUTF16 : function (input) {
    var output = "",
        current,c,
        status=0,
        i = 0;
    
    while (i < input.length) {
      c = input.charCodeAt(i) - 32;
      
      switch (status++) {
        case 0:
          current = c << 1;
          break;
        case 1:
          output += String.fromCharCode(current | (c >> 14));
          current = (c&16383) << 2;
          break;
        case 2:
          output += String.fromCharCode(current | (c >> 13));
          current = (c&8191) << 3;
          break;
        case 3:
          output += String.fromCharCode(current | (c >> 12));
          current = (c&4095) << 4;
          break;
        case 4:
          output += String.fromCharCode(current | (c >> 11));
          current = (c&2047) << 5;
          break;
        case 5:
          output += String.fromCharCode(current | (c >> 10));
          current = (c&1023) << 6;
          break;
        case 6:
          output += String.fromCharCode(current | (c >> 9));
          current = (c&511) << 7;
          break;
        case 7:
          output += String.fromCharCode(current | (c >> 8));
          current = (c&255) << 8;
          break;
        case 8:
          output += String.fromCharCode(current | (c >> 7));
          current = (c&127) << 9;
          break;
        case 9:
          output += String.fromCharCode(current | (c >> 6));
          current = (c&63) << 10;
          break;
        case 10:
          output += String.fromCharCode(current | (c >> 5));
          current = (c&31) << 11;
          break;
        case 11:
          output += String.fromCharCode(current | (c >> 4));
          current = (c&15) << 12;
          break;
        case 12:
          output += String.fromCharCode(current | (c >> 3));
          current = (c&7) << 13;
          break;
        case 13:
          output += String.fromCharCode(current | (c >> 2));
          current = (c&3) << 14;
          break;
        case 14:
          output += String.fromCharCode(current | (c >> 1));
          current = (c&1) << 15;
          break;
        case 15:
          output += String.fromCharCode(current | c);
          status=0;
          break;
      }
      
      
      i++;
    }
    
    return this.decompress(output);
    //return output;
    
  },


  // private property
  _keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
  
  decompress : function (input) {
    var output = "";
    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
    var i = 1;
    var odd = input.charCodeAt(0) >> 8;
    
    while (i < input.length*2 && (i < input.length*2-1 || odd==0)) {
      
      if (i%2==0) {
        chr1 = input.charCodeAt(i/2) >> 8;
        chr2 = input.charCodeAt(i/2) & 255;
        if (i/2+1 < input.length) 
          chr3 = input.charCodeAt(i/2+1) >> 8;
        else 
          chr3 = NaN;
      } else {
        chr1 = input.charCodeAt((i-1)/2) & 255;
        if ((i+1)/2 < input.length) {
          chr2 = input.charCodeAt((i+1)/2) >> 8;
          chr3 = input.charCodeAt((i+1)/2) & 255;
        } else 
          chr2=chr3=NaN;
      }
      i+=3;
      
      enc1 = chr1 >> 2;
      enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
      enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
      enc4 = chr3 & 63;
      
      if (isNaN(chr2) || (i==input.length*2+1 && odd)) {
        enc3 = enc4 = 64;
      } else if (isNaN(chr3) || (i==input.length*2 && odd)) {
        enc4 = 64;
      }
      
      output = output +
        this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
          this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
      
    }
    
    return output;
  },
  
  compress : function (input) {
    var output = "",
        ol = 1, 
        output_,
        chr1, chr2, chr3,
        enc1, enc2, enc3, enc4,
        i = 0, flush=false;
    
    input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
    
    while (i < input.length) {
      
      enc1 = this._keyStr.indexOf(input.charAt(i++));
      enc2 = this._keyStr.indexOf(input.charAt(i++));
      enc3 = this._keyStr.indexOf(input.charAt(i++));
      enc4 = this._keyStr.indexOf(input.charAt(i++));
      
      chr1 = (enc1 << 2) | (enc2 >> 4);
      chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      chr3 = ((enc3 & 3) << 6) | enc4;
      
      if (ol%2==0) {
        output_ = chr1 << 8;
        flush = true;
        
        if (enc3 != 64) {
          output += String.fromCharCode(output_ | chr2);
          flush = false;
        }
        if (enc4 != 64) {
          output_ = chr3 << 8;
          flush = true;
        }
      } else {
        output = output + String.fromCharCode(output_ | chr1);
        flush = false;
        
        if (enc3 != 64) {
          output_ = chr2 << 8;
          flush = true;
        }
        if (enc4 != 64) {
          output += String.fromCharCode(output_ | chr3);
          flush = false;
        }
      }
      ol+=3;
    }
    
    if (flush) {
      output += String.fromCharCode(output_);
      output = String.fromCharCode(output.charCodeAt(0)|256) + output.substring(1);
    }
    
    return output;
    
  }
};function BinaryLoader() {
	var me = this;
	this.done = false;
	this.arrayBuffer = null;
	this.html = null;
	this.error = null;
	this.xmlHttpRequest = null;
	this.load = function (url, onloadCallback, onerrorCallback) { //load binary data
		console.log("BinaryLoader.load " + url);
		this.done = false;
		me.xmlHttpRequest = new XMLHttpRequest();
		me.xmlHttpRequest.open('GET', url, true);
		me.xmlHttpRequest.responseType = 'arraybuffer';
		me.xmlHttpRequest.onload = function () {
			if (me.xmlHttpRequest.status == 200) {
				me.arrayBuffer = me.xmlHttpRequest.response;
				me.done = true;
				if (onloadCallback != null) {
					onloadCallback();
				}
			} else {
				me.done = true;
				me.error = "status != 200";
				if (onerrorCallback != null) {
					onerrorCallback();
				}
			}
		};
		me.xmlHttpRequest.onerror = function (xmlHttpRequestProgressEvent) {
			me.error = xmlHttpRequestProgressEvent;
			me.done = true;
			if (onerrorCallback != null) {
				onerrorCallback();
			}
		};
		me.xmlHttpRequest.send();
	};
	this.read = function (url, onloadCallback, onerrorCallback) { //read page html
		console.log("read " + url);
		this.done = false;
		me.xmlHttpRequest = new XMLHttpRequest();
		me.xmlHttpRequest.open('GET', url, true);
		me.xmlHttpRequest.onload = function () {
			if (me.xmlHttpRequest.status == 200) {
				me.html = me.xmlHttpRequest.response;
				me.done = true;
				if (onloadCallback != null) {
					onloadCallback();
				}
			} else {
				if (me.xmlHttpRequest.status == 0) {
					console.log("read strange bug" ,me.xmlHttpRequest);
				} else {
					me.done = true;
					me.error = "status != 200";
					if (onerrorCallback != null) {
						onerrorCallback();
					}
				}
			}
		};
		me.xmlHttpRequest.onerror = function (xmlHttpRequestProgressEvent) {
			console.log("error " + xmlHttpRequestProgressEvent);
			me.error = xmlHttpRequestProgressEvent;
			me.done = true;
			if (onerrorCallback != null) {
				onerrorCallback();
			}
		};
		me.xmlHttpRequest.send();
	};
	this.post = function (data, url, onloadCallback, onerrorCallback) { //post dtaa and read page html
		console.log("post " + url);
		this.done = false;
		me.xmlHttpRequest = new XMLHttpRequest();
		me.xmlHttpRequest.open('POST', url, true);
		me.xmlHttpRequest.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		//me.xmlHttpRequest.setRequestHeader("Content-length", data.length);
		//me.xmlHttpRequest.setRequestHeader("Connection", "close");
		//console.log(typeof XMLHttpRequest.prototype.sendAsBinary);
		me.xmlHttpRequest.onload = function () {
			if (me.xmlHttpRequest.status == 200) {
				me.html = me.xmlHttpRequest.response;
				me.done = true;
				if (onloadCallback != null) {
					onloadCallback();
				}
			} else {
				me.done = true;
				me.error = "status != 200";
				if (onerrorCallback != null) {
					onerrorCallback();
				}
			}
		};
		me.xmlHttpRequest.onerror = function (xmlHttpRequestProgressEvent) {
			me.error = xmlHttpRequestProgressEvent;
			me.done = true;
			if (onerrorCallback != null) {
				onerrorCallback();
			}
		};
		//var blob = new Blob([data], {type: 'text/plain'});
		var arrayBuffer = new ArrayBuffer(data.length);
		var uint8Array = new Uint8Array(arrayBuffer, 0);
		for (var i = 0; i < data.length; i++) {
			uint8Array[i] = (data.charCodeAt(i) & 0xff);
		}
		me.xmlHttpRequest.send(uint8Array);
	};
	return this;
}
function Cache(){
	var me = this;
	this.binaryLoader = new BinaryLoader();
	//this.arrayBuffers = [];
	//this.float32Arrays=[];
	this.signeds=[];
	this.paths = [];
	this.all = function(song, onDone, onError){
		var nextPath = me.findNotCached(song);
		//console.log("nextPath "+nextPath);
		if (nextPath == null) {
			onDone();
		}
		else {
			me.next(song, nextPath, onDone, onError);
		}
	};
	this.findNotCached = function(song){
		for ( var i = 0; i < song.samples.length; i++) {
			var path = song.samples[i].path;
			var found = false;
			for ( var k = 0; k < me.paths.length; k++) {
				var pathCache = me.paths[k];
				if (path == pathCache) {
					found = true;
					break;
				}
			}
			if (!found) {
				return path;
			}
		}
		return null;
	};
	//var nnn=0;
	this.next = function(song, nextPath, onDone, onError){
		//nnn++;
		var pathPart=nextPath;
		pathPart=pathPart.replace("http://molgav.nn.ru/sf/","");
		app.promptWarning("Cache "+pathPart);
		me.binaryLoader.load(nextPath//
		, function(){
			//me.arrayBuffers[me.arrayBuffers.length] = me.binaryLoader.arrayBuffer;
			//var dataView = new DataView(me.binaryLoader.arrayBuffer);
			/*var f32=new Float32Array(dataView.byteLength);
			//console.log(dataView);
			for (i = 0; i < dataView.byteLength ; i++) {
				f32[i] = dataView.getInt8(i) / 128.0;
			}
			me.float32Arrays[me.float32Arrays.length]=f32;*/
			var signedView=new DataView(me.binaryLoader.arrayBuffer);
			var signed=[];
			for (i = 0; i < signedView.byteLength ; i++) {
				signed.push(signedView.getInt8(i));
			}
			//console.log(signed);
			//dataView.getInt8(mixSample.currentIndex)
			me.signeds[me.signeds.length]=signed;
			
			
			me.paths[me.paths.length] = nextPath;
			me.all(song, onDone, onError);
		}//
		, onError);
	};
	this.moveFromSong=function(song){
		console.log("moveFromSong");
		try{
			for(var i=0;i<song.samples.length;i++){
				var p=song.samples[i].path;
				var s=song.samples[i].signed;
				if(s){
					var exsts=me.findSigned(p);
					if(exsts!=null){
						console.log("skip",p);
					}else{
						console.log("cache",p);
						me.signeds[me.signeds.length]=s;
						me.paths[me.paths.length] = p;
					}
				}
				//console.log("sample",s);
			}
		}catch(e){
			console.log(e);
		}
	};
	this.findSigned = function(path){
		for ( var i = 0; i < this.paths.length; i++) {
			if (this.paths[i] == path) {
				return this.signeds[i];
			}
		}
		console.log("no findSigned "+path);
		return null;
	};
	/*this.__findBuffer = function(path){
		for ( var i = 0; i < this.paths.length; i++) {
			if (this.paths[i] == path) {
				return this.arrayBuffers[i];
			}
		}
		console.log("no findBuffer "+path);
		return null;
	};
	this.__find32Buffer = function(path){
		for ( var i = 0; i < this.paths.length; i++) {
			if (this.paths[i] == path) {
				return this.float32Arrays[i];
			}
		}
		console.log("no find32Buffer "+path);
		return null;
	};*/
	return this;
}
function Horizontal() {
	var me = this;
	this.x = 0;
	this.y = 0;
	this.size = tapSize;
	this.deltaX = 0;
	this.deltaY = 0;
	this.upperPanel = null;
	this.lowerPanel = null;
	this.highlight = false;
	this.visibled = false;
	this.backMode = false;
	this.xAnchor = -1;
	this.stickDown = false;
	var tickBack=false;
	this.render = function (context) {
		//context.fillStyle = "#ff00ff";
		/*
		var grd=context.createLinearGradient(0, me.y + me.size / 2, 0, me.y + me.size *5);
			grd.addColorStop(0,"rgba(255,255,255,0.3)");
			grd.addColorStop(1,"rgba(255,255,255,0");
			context.fillStyle=grd;
		context.fillRect(0, me.y + me.size / 2, app.renderer.w, me.y + me.size *5);
		*/
		//console.log("render",me);
		context.fillStyle = "#ffffff";
		//context.fillRect(me.x + me.size / 2, 0, 1, app.renderer.h);
		context.fillRect(0, me.y + me.size / 2, app.renderer.w, 1);
		
		//context.lineWidth = 20;
		context.beginPath();
		context.arc(me.size, app.renderer.h - me.size, me.size / 2, 0, Math.PI * 2);
		context.strokeStyle = "#ffffff";
		context.lineWidth = 3;
		context.stroke();
		//context.lineWidth = 1;
		tickBack=!tickBack;
		if(tickBack){
			context.fillStyle = "#000066";
		}else{
			context.fillStyle = "#000000";
		}
		//context.fillStyle = "#330000";
		context.fill();
		
		
		context.strokeStyle = "rgba(255,255,255,0.5)";
		context.beginPath();
		context.moveTo(0.4 * me.size + me.size / 2, app.renderer.h - me.size + 0.2 * me.size - me.size / 2);
		context.lineTo(0.15 * me.size + me.size / 2, app.renderer.h - me.size + 0.5 * me.size - me.size / 2);
		context.lineTo(0.4 * me.size + me.size / 2, app.renderer.h - me.size + 0.8 * me.size - me.size / 2);
		context.lineWidth = 2;
		context.stroke();
		
//context.fillStyle = "#33ff33";
		context.beginPath();
		context.arc(me.x + me.size / 2, me.y + me.size / 2, me.size / 2, 0, Math.PI * 2);
		if (me.highlight) {
			context.fillStyle = "#333333";
		} else {
			context.fillStyle = "#000000";
		}
		context.strokeStyle = "#ffffff";
		context.fill();
		
		context.stroke();
		//context.strokeStyle = "rgba(255,255,255,0.25)";
		context.strokeStyle = "rgba(255,255,255,0.5)";
		context.beginPath();
		context.moveTo(me.x + 0.2 * me.size, me.y + 0.4 * me.size);
		context.lineTo(me.x + 0.5 * me.size, me.y + 0.15 * me.size);
		context.lineTo(me.x + 0.8 * me.size, me.y + 0.4 * me.size);
		context.stroke();
		context.beginPath();
		context.moveTo(me.x + 0.2 * me.size, me.y + 0.6 * me.size);
		context.lineTo(me.x + 0.5 * me.size, me.y + 0.85 * me.size);
		context.lineTo(me.x + 0.8 * me.size, me.y + 0.6 * me.size);
		context.stroke();
		context.lineWidth = 1;
	};
	this.afterTap = function (x, y) {
		if (me.backMode) {
			//console.log("back afterTap");
			me.backMode = false;
			app.showSong();
			return;
		} else {
			me.highlight = false;
			if (me.stickDown) {
				var le = y + me.deltaY;
				if (le > app.renderer.h - tapSize) {
					le = app.renderer.h / 1.5;
				} else {
					le = app.renderer.h - tapSize / 2;
				}
				if (le < app.renderer.h - tapSize * 4) {
					le = app.renderer.h - tapSize * 4;
				}
				me.x = x + me.deltaX;
				me.y = le;
			} else {
				var le = y + me.deltaY;
				if (le < tapSize / 2) {
					le = app.renderer.h / 2;
				} else {
					le =  - tapSize / 2;
				}
				me.x = x + me.deltaX;
				me.y = le;
			}
			me.adjustContent();
		}
	};
	this.catchMove = function (x, y) {
		if (me.x < x && x < me.x + me.size) {
			if (me.y < y && y < me.y + me.size) {
				me.deltaX = me.x - x;
				me.deltaY = me.y - y;
				me.highlight = true;
				return true;
			}
		}
		if (x < tapSize * 1.5 && y > app.renderer.h - tapSize * 1.5) {
			me.backMode = true;
			//console.log("back catchMove");
			return true;
		}
		return false;
	};
	this.moveTo = function (x, y) {
		if (!me.backMode) {
			me.x = x + me.deltaX;
			me.y = y + me.deltaY;
			me.adjustContent();
		}
	};
	this.endMove = function (x, y) {
		if (!me.backMode) {
			me.highlight = false;
			me.x = x + me.deltaX;
			me.y = y + me.deltaY;
			me.adjustBounds();
		}
	};
	this.adjustContent = function () {
		if (me.upperPanel != null) {
			me.upperPanel.adjustContent();
		}
		if (me.lowerPanel != null) {
			me.lowerPanel.adjustContent();
		}
	};
	this.adjustBounds = function () {
		var xx = me.x;
		var yy = me.y;
		if (isNaN(xx)) {
			xx = 0;
		}
		if (me.xAnchor > -1) {
			xx = me.xAnchor;
		}
		if (xx > app.renderer.w - tapSize) {
			xx = app.renderer.w - tapSize;
		}
		if (xx < 0) {
			xx = 0;
		}
		if (isNaN(yy)) {
			yy = app.renderer.h / 2;
		}
		if (yy > app.renderer.h - tapSize / 2) {
			yy = app.renderer.h - tapSize / 2;
		}
		if (me.stickDown) {
			if (yy < app.renderer.h - tapSize * 4) {
				yy = app.renderer.h - tapSize * 4;
			}
		} else {
			if (yy < -tapSize / 2) {
				yy = -tapSize / 2;
			}
		}

		me.x = xx;
		me.y = yy;
		me.adjustContent();
	};
	return me;
}
function Item(c, d, a, i) {
    var me = this;
    this.caption = c;
    this.description = d;
    this.action = a;
	this.selected=false;
    if (i == undefined) {
        me.renderIcon = function(context, x, y) {
            context.lineWidth = 1;
            context.beginPath();
            context.arc(x + tapSize / 2, y + tapSize / 2, tapSize / 6, 0, Math.PI * 2);
            context.strokeStyle = "rgba(255,255,255,0.2)";
            context.stroke();
        };
    } else {
        me.renderIcon = i;
    }
    return me;
}function LangEng() {
	var me = this;
	me.yes = function () {
		return "yes";
	};
	me.no = function () {
		return "no";
	};
	me.cancel = function () {
		return "cancel";
	};
	me.areYouSure = function () {
		return "Are you sure?";
	};
	me.play = function () {
		return "Play";
	};
	me.tempo = function () {
		return "Tempo";
	};
	me.meter = function () {
		return "Meter";
	};
	me.clearAll = function () {
		return "Clear all";
	};
	me.help = function () {
		return "Help";
	};
	me.createRiff = function () {
		return "Create new riff";
	};
	
	me.replaceTo = function () {
		return "Replace current";
	};
	
	
	me.saveRiffAsSong = function () {
		return "Save riff as...";
	};
	me.zoom = function () {
		return "Zoom";
	};
	me.save = function () {
		return "Save song as...";
	};
	me.importMid = function () {
		return "Import from .mid";
	};
	me.open = function () {
		return "Open slot";
	};
	me.openSong = function () {
		return "Load saved song";
	};
	me.mergeRiffs = function () {
		return "Merge riffs from song";
	};
	me.color = function () {
		return "Colorization";
	};
	me.colorModeName = function (nn) {
		if (nn == 1) {
			return "base C";
		}
		if (nn == 2) {
			return "base C#";
		}
		if (nn == 3) {
			return "base D";
		}
		if (nn == 4) {
			return "base D#";
		}
		if (nn == 5) {
			return "base E";
		}
		if (nn == 6) {
			return "base F";
		}
		if (nn == 7) {
			return "base F#";
		}
		if (nn == 8) {
			return "base G";
		}
		if (nn == 9) {
			return "base G#";
		}
		if (nn == 10) {
			return "base A";
		}
		if (nn == 11) {
			return "base A#";
		}
		if (nn == 12) {
			return "base B/H";
		}
		return "by instrument";
	};
	me.notYetAvailable = function () {
		return "Not Yet Available";
	};
	me.shift0 = function () {
		return "No margin";
	};
	me.shift8 = function () {
		return "Margin 8/16";
	};
	me.shift16 = function () {
		return "Margin 16/16";
	};
	me.shift24 = function () {
		return "Margin 24/16";
	};
	me.shift32 = function () {
		return "Margin 32/16";
	};
	me.shift40 = function () {
		return "Margin 40/16";
	};
	me.shift48 = function () {
		return "Margin 48/16";
	};
	me.shift56 = function () {
		return "Margin 56/16";
	};
	me.up = function () {
		return "Up";
	};
	me.refresh = function () {
		return "Refresh";
	};
	me.error = function () {
		return "Error";
	};
	me.riffs = function () {
		return "Riffs";
	};
	me.song = function () {
		return "Song";
	};
	me.slot = function () {
		return "Slot";
	};
	me.select = function () {
		return "Select";
	};
	me.removeFromSlot = function () {
		return "Remove from slot";
	};
	me.removeFromSong = function () {
		return "Delete from song";
	};
	me.noSelectedSlot = function () {
		return "No selected slot";
	};
	me.addToSlot = function () {
		return "Add to selected slot";
	};
	me.cloneRiff = function () {
		return "Clone riff...";
	};
	me.oneRiff = function () {
		return "Riff";
	};
	me.riffUsed = function () {
		return "Riff used";
	};
	me.instruments = function () {
		return "Instruments";
	};
	me.cloud = function () {
		return "cloud";
	};
	me.volume = function () {
		return "Volume";
	};
	me.sound = function () {
		return "Sound";
	};
	me.drumUsed = function () {
		return "Drum used";
	};
	me.instrumentUsed = function () {
		return "Instrument used";
	};
	
	me.shiftLeft = function () {
		return "Shift left";
	};
	me.canNotShift = function () {
		return "Can't shift";
	};
	me.shiftRight = function () {
		return "Shift right";
	};
	me.shiftNextRow = function () {
		return "Shift to next row";
	};
	me.noSelectedRiff = function () {
		return "No selected riff";
	};
	me.noSelectedInstrument = function () {
		return "No selected instrument";
	};
	me.noSelectedRiffInSlot = function () {
		return "No selected riff in slot";
	};
	me.increaseZoom = function () {
		return "Increase zoom to edit";
	};

	return me;
}
function List() {
	var me = this;
	me.x = 0;
	me.y = 0;
	me.deltaY = 0;
	me.items = [];
	me.highlight = null;
	me.visibled = true;
	me.bgcolor = "rgba(32,32,32,0.1)";
	me.bgcolor2 = null;//"rgba(255,255,255,0.91)";
	//me.image=null;
	me.render = function (context) {
		
		context.fillStyle = me.bgcolor;//"rgba(32,32,32,0.9)";
		
		if(me.bgcolor2!=null){
			var sz=app.renderer.h;
			if(app.renderer.w<app.renderer.h){
				sz=app.renderer.w;
			}
			//var grd=context.createRadialGradient(me.x,app.renderer.h,5,me.x,app.renderer.h,sz);
			var grd=context.createLinearGradient(me.x,0,me.x+tapSize*5,0);
			grd.addColorStop(0,me.bgcolor2);
			grd.addColorStop(1,me.bgcolor);
			context.fillStyle=grd;
		}
		context.fillRect(me.x, 0, app.renderer.w, app.renderer.h);
		/*if(me.image!=null){
			context.drawImage(me.image,0,0,300,300,me.x,app.renderer.h-300,300,300);
			//console.log(me.image);
		}*/
		if (me.highlight != null) {
			context.fillStyle = "rgba(255,255,255,0.25)";
			context.fillRect(me.x, me.y + me.highlight * tapSize, app.renderer.w, tapSize);
		}
		for (var i = 0; i < me.items.length; i++) {
			if (i * tapSize + me.y > -tapSize && i * tapSize + me.y < app.renderer.h) {
				me.renderItem(context, i);
			}
		}

	};
	me.renderItem = function (context, i) {
		var item = me.items[i];
		if (item.selected) {
			context.fillStyle = "rgba(255,255,255,0.2)";
			context.fillRect(me.x, me.y + i * tapSize, app.renderer.w, tapSize);
			context.fillStyle = "#ffffff";
			context.fillRect(me.x, me.y + i * tapSize+tapSize-1, app.renderer.w, 1);
		}
		context.fillStyle = "#ffffff";
		context.textBaseline = "top";
		context.font = 0.4 * tapSize + "px Arial";
		context.fillText(item.caption, me.x + 1.1 * tapSize, me.y + 0.1 * tapSize + i * tapSize);
		context.font = 0.3 * tapSize + "px Arial";
		context.fillText(item.description, me.x + 1.1 * tapSize, me.y + 0.5 * tapSize + i * tapSize);
		//context.fillStyle = "#ffffff";
		//context.fillRect(me.x, me.y + i * tapSize, tapSize, tapSize - 1);
		item.renderIcon(context, me.x, me.y + i * tapSize);
	};
	me.catchMove = function (x, y) {
		if (me.x < x) {
			me.deltaY = me.y - y;
			var n = Math.floor((y - me.y) / tapSize);
			if (n > -1 && n < me.items.length) {
				me.highlight = n;
			}
			return true;
		}
		return false;
	};
	me.moveTo = function (x, y) {
		me.y = y + me.deltaY;
	};
	me.endMove = function (x, y) {
		var t = y + me.deltaY;
		var l = me.items.length * tapSize;
		if (app.renderer.h > l) {
			t = 0;
		} else {
			if (t < app.renderer.h - l) {
				t = app.renderer.h - l;
			}
			if (t > 0) {
				t = 0;
			}
		}
		me.y = t;
		me.highlight = null;
	};
	me.afterTap = function (x, y) {
		me.y = y + me.deltaY;
		var n = Math.floor((y - me.y) / tapSize);
		if (n > -1 && n < me.items.length) {
			//logger.dump("tap item " + me.items[n].action);
			if (me.items[n].action != null) {
				me.items[n].action();
			}
		}
		me.highlight = null;
	};
	me.add = function (item) {
		me.items[me.items.length] = item;
	};
	/*this.saveSettings=function(song){
	//
	};
	this.loadSettings=function(song){
	//
	};*/
	return me;
}
// Copyright (c) 2013 Pieroxy <pieroxy@pieroxy.net>
// This work is free. You can redistribute it and/or modify it
// under the terms of the WTFPL, Version 2
// For more information see LICENSE.txt or http://www.wtfpl.net/
//
// For more information, the home page:
// http://pieroxy.net/blog/pages/lz-string/testing.html
//
// LZ-based compression algorithm, version 1.3.3
var LZString = {

	// private property
	_keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
	_f : String.fromCharCode,

	compressToBase64 : function (input) {
		if (input == null)
			return "";
		var output = "";
		var chr1,
		chr2,
		chr3,
		enc1,
		enc2,
		enc3,
		enc4;
		var i = 0;

		input = LZString.compress(input);
		while (i < input.length * 2) {

			if (i % 2 == 0) {
				chr1 = input.charCodeAt(i / 2) >> 8;
				chr2 = input.charCodeAt(i / 2) & 255;
				if (i / 2 + 1 < input.length)
					chr3 = input.charCodeAt(i / 2 + 1) >> 8;
				else
					chr3 = NaN;
			} else {
				chr1 = input.charCodeAt((i - 1) / 2) & 255;
				if ((i + 1) / 2 < input.length) {
					chr2 = input.charCodeAt((i + 1) / 2) >> 8;
					chr3 = input.charCodeAt((i + 1) / 2) & 255;
				} else
					chr2 = chr3 = NaN;
			}
			i += 3;

			enc1 = chr1 >> 2;
			enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
			enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
			enc4 = chr3 & 63;

			if (isNaN(chr2)) {
				enc3 = enc4 = 64;
			} else if (isNaN(chr3)) {
				enc4 = 64;
			}

			output = output +
				LZString._keyStr.charAt(enc1) + LZString._keyStr.charAt(enc2) +
				LZString._keyStr.charAt(enc3) + LZString._keyStr.charAt(enc4);

		}

		return output;
	},

	decompressFromBase64 : function (input) {
		if (input == null)
			return "";
		var output = "",
		ol = 0,
		output_,
		chr1,
		chr2,
		chr3,
		enc1,
		enc2,
		enc3,
		enc4,
		i = 0,
		f = LZString._f;

		input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
		while (i < input.length) {

			enc1 = LZString._keyStr.indexOf(input.charAt(i++));
			enc2 = LZString._keyStr.indexOf(input.charAt(i++));
			enc3 = LZString._keyStr.indexOf(input.charAt(i++));
			enc4 = LZString._keyStr.indexOf(input.charAt(i++));

			chr1 = (enc1 << 2) | (enc2 >> 4);
			chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
			chr3 = ((enc3 & 3) << 6) | enc4;

			if (ol % 2 == 0) {
				output_ = chr1 << 8;

				if (enc3 != 64) {
					output += f(output_ | chr2);
				}
				if (enc4 != 64) {
					output_ = chr3 << 8;
				}
			} else {
				output = output + f(output_ | chr1);

				if (enc3 != 64) {
					output_ = chr2 << 8;
				}
				if (enc4 != 64) {
					output += f(output_ | chr3);
				}
			}
			ol += 3;
		}

		return LZString.decompress(output);

	},

	compressToUTF16 : function (input) {
		if (input == null)
			return "";
		var output = "",
		i,
		c,
		current,
		status = 0,
		f = LZString._f;

		input = LZString.compress(input);

		for (i = 0; i < input.length; i++) {
			c = input.charCodeAt(i);
			switch (status++) {
			case 0:
				output += f((c >> 1) + 32);
				current = (c & 1) << 14;
				break;
			case 1:
				output += f((current + (c >> 2)) + 32);
				current = (c & 3) << 13;
				break;
			case 2:
				output += f((current + (c >> 3)) + 32);
				current = (c & 7) << 12;
				break;
			case 3:
				output += f((current + (c >> 4)) + 32);
				current = (c & 15) << 11;
				break;
			case 4:
				output += f((current + (c >> 5)) + 32);
				current = (c & 31) << 10;
				break;
			case 5:
				output += f((current + (c >> 6)) + 32);
				current = (c & 63) << 9;
				break;
			case 6:
				output += f((current + (c >> 7)) + 32);
				current = (c & 127) << 8;
				break;
			case 7:
				output += f((current + (c >> 8)) + 32);
				current = (c & 255) << 7;
				break;
			case 8:
				output += f((current + (c >> 9)) + 32);
				current = (c & 511) << 6;
				break;
			case 9:
				output += f((current + (c >> 10)) + 32);
				current = (c & 1023) << 5;
				break;
			case 10:
				output += f((current + (c >> 11)) + 32);
				current = (c & 2047) << 4;
				break;
			case 11:
				output += f((current + (c >> 12)) + 32);
				current = (c & 4095) << 3;
				break;
			case 12:
				output += f((current + (c >> 13)) + 32);
				current = (c & 8191) << 2;
				break;
			case 13:
				output += f((current + (c >> 14)) + 32);
				current = (c & 16383) << 1;
				break;
			case 14:
				output += f((current + (c >> 15)) + 32, (c & 32767) + 32);
				status = 0;
				break;
			}
		}

		return output + f(current + 32);
	},

	decompressFromUTF16 : function (input) {
		if (input == null)
			return "";
		var output = "",
		current,
		c,
		status = 0,
		i = 0,
		f = LZString._f;
		while (i < input.length) {
			c = input.charCodeAt(i) - 32;

			switch (status++) {
			case 0:
				current = c << 1;
				break;
			case 1:
				output += f(current | (c >> 14));
				current = (c & 16383) << 2;
				break;
			case 2:
				output += f(current | (c >> 13));
				current = (c & 8191) << 3;
				break;
			case 3:
				output += f(current | (c >> 12));
				current = (c & 4095) << 4;
				break;
			case 4:
				output += f(current | (c >> 11));
				current = (c & 2047) << 5;
				break;
			case 5:
				output += f(current | (c >> 10));
				current = (c & 1023) << 6;
				break;
			case 6:
				output += f(current | (c >> 9));
				current = (c & 511) << 7;
				break;
			case 7:
				output += f(current | (c >> 8));
				current = (c & 255) << 8;
				break;
			case 8:
				output += f(current | (c >> 7));
				current = (c & 127) << 9;
				break;
			case 9:
				output += f(current | (c >> 6));
				current = (c & 63) << 10;
				break;
			case 10:
				output += f(current | (c >> 5));
				current = (c & 31) << 11;
				break;
			case 11:
				output += f(current | (c >> 4));
				current = (c & 15) << 12;
				break;
			case 12:
				output += f(current | (c >> 3));
				current = (c & 7) << 13;
				break;
			case 13:
				output += f(current | (c >> 2));
				current = (c & 3) << 14;
				break;
			case 14:
				output += f(current | (c >> 1));
				current = (c & 1) << 15;
				break;
			case 15:
				output += f(current | c);
				status = 0;
				break;
			}

			i++;
		}

		return LZString.decompress(output);
		//return output;

	},

	compress : function (uncompressed) {
		if (uncompressed == null)
			return "";
		var i,
		value,
		context_dictionary = {},
		context_dictionaryToCreate = {},
		context_c = "",
		context_wc = "",
		context_w = "",
		context_enlargeIn = 2, // Compensate for the first entry which should not count
		context_dictSize = 3,
		context_numBits = 2,
		context_data_string = "",
		context_data_val = 0,
		context_data_position = 0,
		ii,
		f = LZString._f;

		for (ii = 0; ii < uncompressed.length; ii += 1) {
			context_c = uncompressed.charAt(ii);
			if (!Object.prototype.hasOwnProperty.call(context_dictionary, context_c)) {
				context_dictionary[context_c] = context_dictSize++;
				context_dictionaryToCreate[context_c] = true;
			}

			context_wc = context_w + context_c;
			if (Object.prototype.hasOwnProperty.call(context_dictionary, context_wc)) {
				context_w = context_wc;
			} else {
				if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
					if (context_w.charCodeAt(0) < 256) {
						for (i = 0; i < context_numBits; i++) {
							context_data_val = (context_data_val << 1);
							if (context_data_position == 15) {
								context_data_position = 0;
								context_data_string += f(context_data_val);
								context_data_val = 0;
							} else {
								context_data_position++;
							}
						}
						value = context_w.charCodeAt(0);
						for (i = 0; i < 8; i++) {
							context_data_val = (context_data_val << 1) | (value & 1);
							if (context_data_position == 15) {
								context_data_position = 0;
								context_data_string += f(context_data_val);
								context_data_val = 0;
							} else {
								context_data_position++;
							}
							value = value >> 1;
						}
					} else {
						value = 1;
						for (i = 0; i < context_numBits; i++) {
							context_data_val = (context_data_val << 1) | value;
							if (context_data_position == 15) {
								context_data_position = 0;
								context_data_string += f(context_data_val);
								context_data_val = 0;
							} else {
								context_data_position++;
							}
							value = 0;
						}
						value = context_w.charCodeAt(0);
						for (i = 0; i < 16; i++) {
							context_data_val = (context_data_val << 1) | (value & 1);
							if (context_data_position == 15) {
								context_data_position = 0;
								context_data_string += f(context_data_val);
								context_data_val = 0;
							} else {
								context_data_position++;
							}
							value = value >> 1;
						}
					}
					context_enlargeIn--;
					if (context_enlargeIn == 0) {
						context_enlargeIn = Math.pow(2, context_numBits);
						context_numBits++;
					}
					delete context_dictionaryToCreate[context_w];
				} else {
					value = context_dictionary[context_w];
					for (i = 0; i < context_numBits; i++) {
						context_data_val = (context_data_val << 1) | (value & 1);
						if (context_data_position == 15) {
							context_data_position = 0;
							context_data_string += f(context_data_val);
							context_data_val = 0;
						} else {
							context_data_position++;
						}
						value = value >> 1;
					}

				}
				context_enlargeIn--;
				if (context_enlargeIn == 0) {
					context_enlargeIn = Math.pow(2, context_numBits);
					context_numBits++;
				}
				// Add wc to the dictionary.
				context_dictionary[context_wc] = context_dictSize++;
				context_w = String(context_c);
			}
		}

		// Output the code for w.
		if (context_w !== "") {
			if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
				if (context_w.charCodeAt(0) < 256) {
					for (i = 0; i < context_numBits; i++) {
						context_data_val = (context_data_val << 1);
						if (context_data_position == 15) {
							context_data_position = 0;
							context_data_string += f(context_data_val);
							context_data_val = 0;
						} else {
							context_data_position++;
						}
					}
					value = context_w.charCodeAt(0);
					for (i = 0; i < 8; i++) {
						context_data_val = (context_data_val << 1) | (value & 1);
						if (context_data_position == 15) {
							context_data_position = 0;
							context_data_string += f(context_data_val);
							context_data_val = 0;
						} else {
							context_data_position++;
						}
						value = value >> 1;
					}
				} else {
					value = 1;
					for (i = 0; i < context_numBits; i++) {
						context_data_val = (context_data_val << 1) | value;
						if (context_data_position == 15) {
							context_data_position = 0;
							context_data_string += f(context_data_val);
							context_data_val = 0;
						} else {
							context_data_position++;
						}
						value = 0;
					}
					value = context_w.charCodeAt(0);
					for (i = 0; i < 16; i++) {
						context_data_val = (context_data_val << 1) | (value & 1);
						if (context_data_position == 15) {
							context_data_position = 0;
							context_data_string += f(context_data_val);
							context_data_val = 0;
						} else {
							context_data_position++;
						}
						value = value >> 1;
					}
				}
				context_enlargeIn--;
				if (context_enlargeIn == 0) {
					context_enlargeIn = Math.pow(2, context_numBits);
					context_numBits++;
				}
				delete context_dictionaryToCreate[context_w];
			} else {
				value = context_dictionary[context_w];
				for (i = 0; i < context_numBits; i++) {
					context_data_val = (context_data_val << 1) | (value & 1);
					if (context_data_position == 15) {
						context_data_position = 0;
						context_data_string += f(context_data_val);
						context_data_val = 0;
					} else {
						context_data_position++;
					}
					value = value >> 1;
				}

			}
			context_enlargeIn--;
			if (context_enlargeIn == 0) {
				context_enlargeIn = Math.pow(2, context_numBits);
				context_numBits++;
			}
		}

		// Mark the end of the stream
		value = 2;
		for (i = 0; i < context_numBits; i++) {
			context_data_val = (context_data_val << 1) | (value & 1);
			if (context_data_position == 15) {
				context_data_position = 0;
				context_data_string += f(context_data_val);
				context_data_val = 0;
			} else {
				context_data_position++;
			}
			value = value >> 1;
		}

		// Flush the last char
		while (true) {
			context_data_val = (context_data_val << 1);
			if (context_data_position == 15) {
				context_data_string += f(context_data_val);
				break;
			} else
				context_data_position++;
		}
		return context_data_string;
	},

	decompress : function (compressed) {
		if (compressed == null)
			return "";
		if (compressed == "")
			return null;
		var dictionary = [],
		next,
		enlargeIn = 4,
		dictSize = 4,
		numBits = 3,
		entry = "",
		result = "",
		i,
		w,
		bits,
		resb,
		maxpower,
		power,
		c,
		f = LZString._f,
		data = {
			string : compressed,
			val : compressed.charCodeAt(0),
			position : 32768,
			index : 1
		};

		for (i = 0; i < 3; i += 1) {
			dictionary[i] = i;
		}

		bits = 0;
		maxpower = Math.pow(2, 2);
		power = 1;
		while (power != maxpower) {
			resb = data.val & data.position;
			data.position >>= 1;
			if (data.position == 0) {
				data.position = 32768;
				data.val = data.string.charCodeAt(data.index++);
			}
			bits |= (resb > 0 ? 1 : 0) * power;
			power <<= 1;
		}

		switch (next = bits) {
		case 0:
			bits = 0;
			maxpower = Math.pow(2, 8);
			power = 1;
			while (power != maxpower) {
				resb = data.val & data.position;
				data.position >>= 1;
				if (data.position == 0) {
					data.position = 32768;
					data.val = data.string.charCodeAt(data.index++);
				}
				bits |= (resb > 0 ? 1 : 0) * power;
				power <<= 1;
			}
			c = f(bits);
			break;
		case 1:
			bits = 0;
			maxpower = Math.pow(2, 16);
			power = 1;
			while (power != maxpower) {
				resb = data.val & data.position;
				data.position >>= 1;
				if (data.position == 0) {
					data.position = 32768;
					data.val = data.string.charCodeAt(data.index++);
				}
				bits |= (resb > 0 ? 1 : 0) * power;
				power <<= 1;
			}
			c = f(bits);
			break;
		case 2:
			return "";
		}
		dictionary[3] = c;
		w = result = c;
		while (true) {
			if (data.index > data.string.length) {
				return "";
			}

			bits = 0;
			maxpower = Math.pow(2, numBits);
			power = 1;
			while (power != maxpower) {
				resb = data.val & data.position;
				data.position >>= 1;
				if (data.position == 0) {
					data.position = 32768;
					data.val = data.string.charCodeAt(data.index++);
				}
				bits |= (resb > 0 ? 1 : 0) * power;
				power <<= 1;
			}

			switch (c = bits) {
			case 0:
				bits = 0;
				maxpower = Math.pow(2, 8);
				power = 1;
				while (power != maxpower) {
					resb = data.val & data.position;
					data.position >>= 1;
					if (data.position == 0) {
						data.position = 32768;
						data.val = data.string.charCodeAt(data.index++);
					}
					bits |= (resb > 0 ? 1 : 0) * power;
					power <<= 1;
				}

				dictionary[dictSize++] = f(bits);
				c = dictSize - 1;
				enlargeIn--;
				break;
			case 1:
				bits = 0;
				maxpower = Math.pow(2, 16);
				power = 1;
				while (power != maxpower) {
					resb = data.val & data.position;
					data.position >>= 1;
					if (data.position == 0) {
						data.position = 32768;
						data.val = data.string.charCodeAt(data.index++);
					}
					bits |= (resb > 0 ? 1 : 0) * power;
					power <<= 1;
				}
				dictionary[dictSize++] = f(bits);
				c = dictSize - 1;
				enlargeIn--;
				break;
			case 2:
				return result;
			}

			if (enlargeIn == 0) {
				enlargeIn = Math.pow(2, numBits);
				numBits++;
			}

			if (dictionary[c]) {
				entry = dictionary[c];
			} else {
				if (c === dictSize) {
					entry = w + w.charAt(0);
				} else {
					return null;
				}
			}
			result += entry;

			// Add w+entry[0] to the dictionary.
			dictionary[dictSize++] = w + entry.charAt(0);
			enlargeIn--;

			w = entry;

			if (enlargeIn == 0) {
				enlargeIn = Math.pow(2, numBits);
				numBits++;
			}

		}
	}
};

if (typeof module !== 'undefined' && module != null) {
	module.exports = LZString
}
//LZW Compression/Decompression for Strings
var LZW = {
	compress : function (uncompressed) {
		//"use strict";
		// Build the dictionary.
		var i,
		dictionary = {},
		c,
		wc,
		w = "",
		result = [],
		dictSize = 256;
		for (i = 0; i < 256; i += 1) {
			dictionary[String.fromCharCode(i)] = i;
		}

		for (i = 0; i < uncompressed.length; i += 1) {
			c = uncompressed.charAt(i);
			wc = w + c;
			//Do not use dictionary[wc] because javascript arrays
			//will return values for array['pop'], array['push'] etc
			// if (dictionary[wc]) {
			if (dictionary.hasOwnProperty(wc)) {
				w = wc;
			} else {
				result.push(dictionary[w]);
				// Add wc to the dictionary.
				dictionary[wc] = dictSize++;
				w = String(c);
			}
		}

		// Output the code for w.
		if (w !== "") {
			result.push(dictionary[w]);
		}
		return result;
	},

	decompress : function (compressed) {
		//"use strict";
		// Build the dictionary.
		var i,
		dictionary = [],
		w,
		result,
		k,
		entry = "",
		dictSize = 256;
		for (i = 0; i < 256; i += 1) {
			dictionary[i] = String.fromCharCode(i);
		}

		w = String.fromCharCode(compressed[0]);
		result = w;
		for (i = 1; i < compressed.length; i += 1) {
			k = compressed[i];
			if (dictionary[k]) {
				entry = dictionary[k];
			} else {
				if (k === dictSize) {
					entry = w + w.charAt(0);
				} else {
					return null;
				}
			}

			result += entry;

			// Add w+entry[0] to the dictionary.
			dictionary[dictSize++] = w + entry.charAt(0);

			w = entry;
		}
		return result;
	}
};
/*
, // For Test Purposes
comp = LZW.compress("TOBEORNOTTOBEORTOBEORNOT"),
decomp = LZW.decompress(comp);
document.write(comp + '<br>' + decomp);
*/function MenuExamples() {
	var me = this;
	//this.base = "http://www.javafx.me/midi/";
	this.base = "http://www.javafx.me/midisamples/";
	this.currentPath = this.base;
	this.binaryLoader = new BinaryLoader();
	/*this.iconFolder = function (context, x, y) {
	context.lineWidth = 1;
	context.beginPath();
	context.moveTo(x + tapSize / 4, y + tapSize / 4);
	context.lineTo(x + 3 * tapSize / 4, y + tapSize / 4);
	context.lineTo(x + 3 * tapSize / 4, y + 3 * tapSize / 4);
	context.lineTo(x + tapSize / 4, y + 3 * tapSize / 4);
	context.lineTo(x + tapSize / 4, y + tapSize / 4);
	context.strokeStyle = "rgba(255,255,255,0.5)";
	context.stroke();
	};*/
	/*this.iconFile = function (context, x, y) {
	context.lineWidth = 1;
	context.beginPath();
	context.arc(x + tapSize / 2, y + tapSize / 2, tapSize / 4, 0, Math.PI * 2);
	context.strokeStyle = "rgba(255,255,255,0.2)";
	context.stroke();
	};*/
	this.promptLoad = function (path) {
		var items = [];
		items[items.length] = new Item(lang.shift0(), "", function () {
				me.loadFile(path, 0, app.song.meter);
			});
		items[items.length] = new Item(lang.shift8(), "", function () {
				me.loadFile(path, 8, app.song.meter);
			});
		items[items.length] = new Item(lang.shift16(), "", function () {
				me.loadFile(path, 16, app.song.meter);
			});
		items[items.length] = new Item(lang.shift24(), "", function () {
				me.loadFile(path, 24, app.song.meter);
			});
		items[items.length] = new Item(lang.shift32(), "", function () {
				me.loadFile(path, 32, app.song.meter);
			});
		items[items.length] = new Item(lang.shift40(), "", function () {
				me.loadFile(path, 40, app.song.meter);
			});
		items[items.length] = new Item(lang.shift48(), "", function () {
				me.loadFile(path, 48, app.song.meter);
			});
		items[items.length] = new Item(lang.shift56(), "", function () {
				me.loadFile(path, 56, app.song.meter);
			});
		//app.promptSelect(lang.meter()+" " + app.song.meter + ", " + path.substr(me.base.length + 2), items);
		app.promptSelect(lang.meter()+" " + app.song.meter + ", " + path.substr(me.base.length + 0), items);

		/*
		app.promptConfirm("Load " + path.substr(me.base.length), function () {
		// console.log("load "+path);
		app.showSong();
		me.loadFile(path,0,64);
		});*/
	};
	this.loadFile = function (path, padStart, riffSize) {
		app.showSong();
		var binaryLoader = new BinaryLoader();
		binaryLoader.load(path //
		, function () {
			//console.log(binaryLoader.arrayBuffer);
			var midiParser = new MidiParser(binaryLoader.arrayBuffer);
			midiParser.parse(padStart, riffSize);
		} //
		, function () {
			console.log("ops");
		});
	};
	this.onloadCallback = function () {
		if (me.currentPath != me.base) {
			me.list.add(new Item(lang.up(), me.currentPath.substr(me.base.length), function () {
					// console.log("tap test");
					var folders = me.currentPath.split("/");
					var path = "";
					for (var i = 0; i < folders.length - 2; i++) {
						path = path + folders[i] + "/";
						// console.log("path "+path);
					}
					me.currentPath = path;
					me.refresh();
				},toolbox.iconUp));
		}
		// console.log("ok "+binaryLoader.html);
		var rows = me.binaryLoader.html.split("<a href=\"");
		var parts = null;
		for (var i = 6; i < rows.length; i++) {
			parts = rows[i].split("\">");
			if (parts.length > 0) {
				// console.log(parts[0]);
				var caption = parts[0];
				var description = "";
				var icon = toolbox.iconFolder;
				var action = function () {
					// console.log("tap "+this.selectedName);
					me.currentPath = me.currentPath + this.selectedName;
					me.refresh();
				};
				if (parts[0].trim().charAt(parts[0].length - 1) != '/') {
					caption = "";
					description = parts[0];
					icon = toolbox.iconSpeaker;
					action = function () {
						// console.log("tap "+this.selectedName);
						// me.currentPath=me.currentPath+this.selectedName;
						me.promptLoad(me.currentPath + this.selectedName);
					};
				}
				var item = new Item(caption, description, action, icon);
				item.selectedName = parts[0];
				me.list.add(item);
			}
		}
		me.list.y = 0;
		
		app.renderer.fireRender();
	};
	this.onerrorCallback = function () {
		console.log("ops");
		console.log(me.binaryLoader.error);
		me.list.add(new Item(lang.refresh(), lang.error(), function () {
				me.currentPath = me.base;
				me.refresh();
			}));
		app.renderer.fireRender();
		app.promptWarning(lang.error());
	};
	this.refresh = function () {
		console.log("MenuExamples.refresh "+me.currentPath);
		me.list.items.splice(0, me.list.items.length);
		me.binaryLoader.read(me.currentPath //
		, me.onloadCallback //
		, me.onerrorCallback //
		);

	};
	/*this.hide=function(){
		me.list.visibled=false;
		me.vertical.visibled=false;
	};*/
	this.init = function () {
		me.vertical = new Vertical();
		me.vertical.yAnchor=1.2*1*tapSize+0.5*tapSize;
		me.list = new List();
		me.vertical.content = me.list;
		me.list.x = me.vertical.x + 0.5 * tapSize;
		app.renderer.layers[app.renderer.layers.length] = me.list;
		app.renderer.layers[app.renderer.layers.length] = me.vertical;
		//me.refresh();
	};
	this.saveSettings = function (song) {
		song.settingsMenuExamplesX = me.vertical.x;
		song.settingsMenuExamplesY = me.vertical.y;
		saveTexToStorage("menuExamplesPath",me.currentPath);
	};
	this.loadSettings = function (song) {
		console.log("MenuExamples.loadSettings");
		me.vertical.x = song.settingsMenuExamplesX;
		me.vertical.y = song.settingsMenuExamplesY;
		me.vertical.adjustBounds();
		me.list.x = me.vertical.x + 0.5 * tapSize;
		var t = readTexFromStorage("menuExamplesPath");
		if(t){
		if(t.length>11){
			//console.log("t "+t);
			me.currentPath=t;
		}}
		//me.currentPath="http://www.javafx.me/midi/j/";
		me.refresh();
	};
	return this;
}
function MenuRiffs() {
	var me = this;
	this.showAll = true;
	this.itemFilter = new Item(lang.riffs(), lang.song(), function () {
			//console.log("filter");

			if (me.showAll) {
				me.showAll = false;
				//me.itemFilter.caption = "Position riffs";
				me.itemFilter.description = lang.slot();
			} else {
				me.showAll = true;
				//me.itemFilter.caption = "Song riffs";
				me.itemFilter.description = lang.song();
			}
			me.refresh();
		}, function (context, x, y) {

			var n = 0;
			if (me.showAll) {
				n = 1;
			}
			toolbox.drawSwitch(context, x, y, n, 1);
			/*if (me.showAll) {
			context.lineWidth = 1;
			context.beginPath();
			context.arc(x + tapSize / 2, y + tapSize / 2, tapSize / 4, 0, Math.PI * 2);
			context.fillStyle = "rgba(255,255,255,0.5)";
			context.fill();
			context.stroke();
			} else {
			context.lineWidth = 1;
			context.beginPath();
			context.arc(x + tapSize / 2, y + tapSize / 2, tapSize / 4, 0, Math.PI * 2);
			context.strokeStyle = "rgba(255,255,255,0.5)";
			context.stroke();
			context.beginPath();
			context.arc(x + tapSize / 2, y + tapSize / 2, tapSize / 4, 0, Math.PI);
			context.fillStyle = "rgba(255,255,255,0.5)";
			context.fill();
			}*/
		});

	this.init = function () {
		console.log("MenuRiffs.init");
		me.vertical = new Vertical();
		me.vertical.yAnchor = 1.2 * 1 * tapSize + 0.5 * tapSize;
		me.list = new List();
		//me.list.image=bgRiffs;
		//me.list.bgcolor = "rgba(16,24,24,0.9)";
		me.list.bgcolor = "rgba(0,16,0,0.5)";
		me.list.bgcolor2 = "rgba(0,16,0,0.99)";
		me.vertical.content = me.list;
		me.list.x = me.vertical.x + 0.5 * tapSize;
		app.renderer.layers[app.renderer.layers.length] = me.list;
		app.renderer.layers[app.renderer.layers.length] = me.vertical;
		me.refresh();
	};
	this.saveSettings = function (song) {
		song.settingsMenuRiffsX = me.vertical.x;
		song.settingsMenuRiffsY = me.vertical.y;
	};
	this.loadSettings = function (song) {
		console.log("MenuRiffs.loadSettings");
		me.vertical.x = song.settingsMenuRiffsX;
		me.vertical.y = song.settingsMenuRiffsY;
		me.vertical.adjustBounds();
		me.list.x = me.vertical.x + 0.5 * tapSize;
	};
	this.onSelect = function (songRiff) {
		//console.log(songRiff);
		//try{
			var songPosition = toolbox.findPosition(app.song.selectedPositionId, app.song, true);			
			var exst=toolbox.existsRiffIdInPosition(songRiff.id,songPosition);
			//console.log(exst,songRiff.id,songPosition);
			if(exst){
				me.selectRiff(songRiff);
				//me.refresh();
			}
		/*}catch(e){
			console.log(e);
		}*/
		var items = [];
		items[items.length] = new Item(lang.play(), "", function () {
				me.playRiff(songRiff);
			});
/*			
		items[items.length] = new Item(lang.select(), "", function () {
				me.selectRiff(songRiff);
			});
*/
		if(!exst){
		items[items.length] = new Item(lang.addToSlot(), "", function () {
				if (toolbox.findPosition(app.song.selectedPositionId, app.song) == null) {
					app.promptWarning(lang.noSelectedSlot());
				} else {
					me.addRiffToPosition(songRiff);
				}
			});
}
		items[items.length] = new Item(lang.cloneRiff(), "", function () {
				/*app.promptConfirm(lang.areYouSure(), function () {
				me.cloneRiffToSlot(songRiff);
				});*/
				//mergeRiffToSelectedRiff
				var items = [];
				items[items.length] = new Item("single riff to slot", "", function () {
						me.cloneRiffToSlot(songRiff);
					});
				items[items.length] = new Item("riff for each instrument to slot", "", function () {
						me.splitRiffToSlot(songRiff);
					});
				items[items.length] = new Item("single riff to selected riff", "", function () {
						me.mergeRiffToSelectedRiff(songRiff);
					});
				app.promptSelect("Clone riff", items);
			});
		items[items.length] = new Item(lang.saveRiffAsSong(), "", function () {
				me.saveRiffAsSong(songRiff);
			});
if(exst){
		items[items.length] = new Item(lang.removeFromSlot(), "", function () {
				if (toolbox.findPosition(app.song.selectedPositionId, app.song) == null) {
					app.promptWarning(lang.noSelectedSlot());
				} else {
					app.promptConfirm(lang.areYouSure(), function () {
						me.removeRiffFromPosition(songRiff);
					});
				}
			});
			}else{
		items[items.length] = new Item(lang.removeFromSong(), "", function () {
				app.promptConfirm(lang.areYouSure(), function () {
					me.deleteRiffFromSong(songRiff);
				});
			});}
		items[items.length] = new Item('Edit label', "", function () {
				var tt = prompt("Riff label",songRiff.comment);
					if(tt!=null && tt.trim().length>0){
						songRiff.comment=tt.trim();
						me.refresh();
					}
			});
		app.promptSelect(lang.oneRiff(), items);
	};
	this.saveRiffAsSong = function (songRiff) {
		console.log("songRiff", songRiff.beat.length, songRiff);
		var song = new Song();
		toolbox.addRiffToSong(songRiff, song);
		for (var s = 0; s < songRiff.beat.length; s++) {
			//console.log("s ",s);
			var chord = songRiff.beat[s];
			for (var i = 0; i < chord.length; i++) {
				//console.log("i ",i);
				var songRiffBeatPoint = chord[i];
				var sampleId = songRiffBeatPoint.sampleId;
				//console.log("beat ",s,i,sampleId);
				var smpl = toolbox.findSampleById(sampleId, app.song);
				//toolbox.addSampleToSong(s.path, song);
				if (!toolbox.existsSampleIdInSong(smpl.id, song)) {
					song.samples[song.samples.length] = smpl;
				}
			}
		}
		for (var t = 0; t < songRiff.tunes.length; t++) {
			var songRiffTune = songRiff.tunes[t];
			var sampleId = songRiffTune.sampleId;
			//console.log("ins ",sampleId);
			var smpl = toolbox.findSampleById(sampleId, app.song);
			//toolbox.addSampleToSong(s.path, song);
			//song.samples[song.samples.length] = smpl;
			if (!toolbox.existsSampleIdInSong(smpl.id, song)) {
				song.samples[song.samples.length] = smpl;
			}
		}
		//song.samples=app.song.samples;
		console.log("saveRiffAsSong", song);
		//var str = JSON.stringify(song);
		//window.open("data:text/csv;charset=utf-8," + escape(str), "export.triton");
		for(var i=0;i<song.samples.length;i++){
				var p=song.samples[i].path;
				song.samples[i].signed=app.cache.findSigned(p);
			}
		var str = JSON.stringify(song);
		for(var i=0;i<song.samples.length;i++){
				song.samples[i].signed=null;
			}
		//window.open("data:text/csv;charset=utf-8," + escape(str), "export.molgav");
		//console.log(app.compiler);
		app.compiler.saveFileAs(new Blob([str], {
			type : "application/javascript"
		}), "riff.molgav");
	}
	this.removePositionIfEmpty = function () {
		if (toolbox.findPosition(app.song.selectedPositionId, app.song).riffIds.length < 1) {
			for (var i = 0; i < app.song.positions.length; i++) {
				if (app.song.positions[i].id == toolbox.findPosition(app.song.selectedPositionId, app.song).id) {
					app.song.positions.splice(i, 1);
					//toolbox.findPosition(app.song.selectedPositionId,app.song) = null;
					app.showSong();
					break;
				}
			}
		}
	};
	this.removeRiffFromPosition = function (songRiff) {
		console.log("removeRiffFromPosition");
		//console.log(songRiff);
		for (var i = 0; i < toolbox.findPosition(app.song.selectedPositionId, app.song).riffIds.length; i++) {
			if (toolbox.findPosition(app.song.selectedPositionId, app.song).riffIds[i] == songRiff.id) {
				toolbox.findPosition(app.song.selectedPositionId, app.song).riffIds.splice(i, 1);
				me.removePositionIfEmpty();
				me.refresh();
				break;
			}
		}
	};
	this.addRiffToPosition = function (songRiff) {
		console.log("addRiffToPosition");
		//console.log(songRiff);
		for (var i = 0; i < toolbox.findPosition(app.song.selectedPositionId, app.song).riffIds.length; i++) {
			if (toolbox.findPosition(app.song.selectedPositionId, app.song).riffIds[i] == songRiff.id) {
				return;
			}
		}
		toolbox.findPosition(app.song.selectedPositionId, app.song).riffIds[toolbox.findPosition(app.song.selectedPositionId, app.song).riffIds.length] = songRiff.id;
		me.selectRiff(songRiff);
	};

	this.splitRiffToSlot = function (songRiff) {
		var slot = toolbox.findPosition(app.song.selectedPositionId, app.song);
		if (slot != null) {
			var newRiff = new SongRiff();
			toolbox.addRiffToSong(newRiff, app.song);
			newRiff.songId = songRiff.songId;
			newRiff.comment = songRiff.comment;
			for (var s = 0; s < songRiff.beat.length; s++) {
				var chord = songRiff.beat[s];
				for (var i = 0; i < chord.length; i++) {
					var songRiffBeatPoint = chord[i];
					var sampleId = songRiffBeatPoint.sampleId;
					toolbox.setBeatPointToRiff(s, sampleId, newRiff);
				}
			}
			toolbox.addRiffIdToPosition(newRiff.id, slot);
			for (var t = 0; t < songRiff.tunes.length; t++) {
				newRiff = new SongRiff();
				toolbox.addRiffToSong(newRiff, app.song);
				newRiff.songId = songRiff.songId;
				newRiff.comment = songRiff.comment;
				var songRiffTune = songRiff.tunes[t];
				var tune = new SongRiffTune();
				tune.sampleId = songRiffTune.sampleId;
				for (var s = 0; s < songRiffTune.steps.length; s++) {
					var steps = songRiffTune.steps[s];
					for (var p = 0; p < steps.length; p++) {
						var songRiffTunePoint = steps[p];
						toolbox.setTunePointToTune(s, songRiffTunePoint.pitch, songRiffTunePoint.length, songRiffTunePoint.shift, tune);
					}
				}
				toolbox.addTuneToRiff(tune, newRiff);
				toolbox.addRiffIdToPosition(newRiff.id, slot);
			}
			me.refresh();
			app.renderer.menuSamples.refresh();
		} else {
			app.promptWarning("No selected slot");
		}
	}
	this.mergeRiffToSelectedRiff = function (songRiff) {
		var to = toolbox.findRiffById(app.song.selectedRiffId, app.song);
		if (to == null) {
			app.promptWarning("No selected riff");
		} else {
			if (app.song.selectedRiffId == songRiff.id) {
				app.promptWarning("Same riff");
			} else {
				//console.log("before",app.song.riffs.length,app.song);
				var r = toolbox.createRiffClone(songRiff, app.song);
				//console.log("riff",app.song.riffs.length,r);
				//console.log("after",app.song.riffs.length,app.song);
				for (var s = 0; s < songRiff.beat.length; s++) {
					var chord = songRiff.beat[s];
					for (var i = 0; i < chord.length; i++) {
						var songRiffBeatPoint = chord[i];
						var sampleId = songRiffBeatPoint.sampleId;
						toolbox.setBeatPointToRiff(s, sampleId, to);
					}
				}
				for (var t = 0; t < songRiff.tunes.length; t++) {
					var songRiffTune = songRiff.tunes[t];
					to.tunes[to.tunes.length] = songRiffTune;
				}

				var nn = toolbox.dropRiffFromSong(r, app.song);
				//console.log("back",app.song.riffs.length,nn,app.song);
				me.refresh();
				app.renderer.menuSamples.refresh();
			}
		}
		//me.selectRiff(r);

	}
	this.cloneRiffToSlot = function (songRiff) {
		var r = toolbox.createRiffClone(songRiff, app.song);
		var slot = toolbox.findPosition(app.song.selectedPositionId, app.song);
		if (slot != null) {
			toolbox.addRiffIdToPosition(r.id, slot);
		}
		me.selectRiff(r);
	}
	this.deleteUnusedRiffFromSong=function(songRiff,song){
		for (var i = 0; i < song.positions.length; i++) {
			var songPosition = song.positions[i];
			for (var n = 0; n < songPosition.riffIds.length; n++) {
				if (songPosition.riffIds[n] == songRiff.id) {
					return songPosition;
				}
			}
		}
		for (var i = 0; i < app.song.riffs.length; i++) {
			if (app.song.riffs[i].id == songRiff.id) {
				app.song.riffs.splice(i, 1);
				return null;
			}
		}
		return null;
	};
	this.deleteRiffFromSong = function (songRiff) {
		var songPosition=me.deleteUnusedRiffFromSong(songRiff,app.song);
		if(songPosition){
			app.showPosition(songPosition);
			app.promptWarning(lang.riffUsed());
		}else{
			app.song.selectedRiffId = null;
			me.refresh();
		}
		/*
		console.log("deleteRiffFromSong");
		//console.log(songRiff);
		for (var i = 0; i < app.song.positions.length; i++) {
			var songPosition = app.song.positions[i];
			for (var n = 0; n < songPosition.riffIds.length; n++) {
				if (songPosition.riffIds[n] == songRiff.id) {
					//console.log("used");
					//toolbox.findPosition(app.song.selectedPositionId,app.song)=songPosition;
					app.showPosition(songPosition);
					//me.refresh();
					app.promptWarning(lang.riffUsed());
					return;
				}
			}
		}
		//console.log("drop");
		for (var i = 0; i < app.song.riffs.length; i++) {
			if (app.song.riffs[i].id == songRiff.id) {
				app.song.selectedRiffId = null;
				app.song.riffs.splice(i, 1);
				me.refresh();
				break;
			}
		}
		*/
	};
	this.selectFirstInstrument=function(songRiff){
		console.log("selectFirstInstrument",app.song.selectedSampleId);
		if((app.song.selectedSampleId)==null || (!toolbox.existsInstrumentIdInRiff(app.song.selectedSampleId,songRiff))){
			for(var i=0;i<app.song.samples.length;i++){
				var songSample=app.song.samples[i];
				if(!songSample.isDrum){
					if(toolbox.existsInstrumentIdInRiff(songSample.id,songRiff)){
						app.song.selectedSampleId=songSample.id;
						console.log("reset",app.song.selectedSampleId);
						break;
					}
				}
			}
		}
		
		
		app.renderer.menuSamples.refresh();
	};
	this.selectRiff = function (songRiff) {
		//console.log(songRiff);
		app.song.selectedRiffId = songRiff.id;
		me.selectFirstInstrument(songRiff);
		me.refresh();
		
	};
	this.playRiff = function (songRiff) {
		var song = new Song();
		song.meter = app.song.meter;
		song.tempo = app.song.tempo;
		var songPosition = toolbox.getPositionFromSong(0, 0, song);
		/*for(var i=0;i<songRiff.tunes.length;i++){
		var songRiffTune=songRiff.tunes[i];
		var songSample=toolbox.findSampleById(songRiffTune.sampleId,app.song);
		var s=toolbox.addSampleToSong(songSample.path,song);
		s.id=songSample.id;
		}*/
		//var songRiff = new SongRiff();
		//var songRiffTune = new SongRiffTune();
		//var songSample = toolbox.addSampleToSong(s.path, song);
		//songRiffTune.sampleId = songSample.id;
		//toolbox.addTuneToRiff(songRiffTune, songRiff);
		song.samples = app.song.samples;
		toolbox.addRiffToSong(songRiff, song);
		toolbox.addRiffIdToPosition(songRiff.id, songPosition);
		//toolbox.setTunePointToTune(0, p, 12, 0, songRiffTune);
		console.log(song);
		app.playSong(song);
	};
	this.menuNewRiff = new Item(lang.createRiff(), "", function () {
			//app.promptConfirm(lang.areYouSure(), function () {
				var songRiff = new SongRiff();
				app.song.riffs[app.song.riffs.length] = songRiff;
				app.renderer.menuRiffs.refresh();
				var pos = toolbox.findPosition(app.song.selectedPositionId, app.song);
				if (pos != null) {
					var pp = pos; //toolbox.findPosition(app.song.selectedPositionId, app.song)
					pp.riffIds[pp.riffIds.length] = songRiff.id;
					app.showPosition(pp);
				} else {
					var p0 = toolbox.findOrCreatePositionXY(app.song, 0, 0);
					p0.riffIds[p0.riffIds.length] = songRiff.id;
					app.song.positions[app.song.positions.length] = p0;
					app.showPosition(p0);
				}
				app.renderer.menuRiffs.selectRiff(songRiff);
			//});
		});
	this.refresh = function () {
		me.list.items.splice(0, me.list.items.length);
		me.list.add(this.itemFilter);
		me.list.add(this.menuNewRiff);
		if (me.showAll && (app.song.riffs)) {
			for (var i = 0; i < app.song.riffs.length; i++) {
				var songRiff = app.song.riffs[i];
				var item = new Item("" + songRiff.id+' '+songRiff.comment, "", function () {
						me.onSelect(this.songRiff);
					}, function (context, x, y) {
						app.renderer.drawRiff(x, y, 3 * tapSize, tapSize, this.songRiff, app.song.meter);
					});
				item.songRiff = songRiff;
				var id1 = app.song.selectedRiffId;
				var id2 = songRiff.id;
				//console.log((id1 + 0.1) + " / " + (id2 + 0.1));
				if (id1 == id2) {
					//console.log("==");
					item.selected = true;
				} else {
					item.selected = false;
				}
				me.list.add(item);
			}
		} else {
			if (toolbox.findPosition(app.song.selectedPositionId, app.song) != null) {
				for (var i = 0; i < toolbox.findPosition(app.song.selectedPositionId, app.song).riffIds.length; i++) {
					var id = toolbox.findPosition(app.song.selectedPositionId, app.song).riffIds[i];
					var songRiff = toolbox.findRiffById(id, app.song);
					var item = new Item("" + songRiff.id+' '+songRiff.comment, "", function () {
							me.onSelect(this.songRiff);
						}, function (context, x, y) {
							app.renderer.drawRiff(x, y, 3 * tapSize, tapSize, this.songRiff, app.song.meter);
						});
					item.songRiff = songRiff;
					var id1 = app.song.selectedRiffId;
					var id2 = songRiff.id;
					if (id1 == id2) {
						//console.log(app.song.selectedRiffId + " / " + item.songRiff.id);
						item.selected = true;
					} else {
						item.selected = false;
					}
					me.list.add(item);
				}
			}
		}
	}
	return this;
}
function MenuSamples() {
	var me = this;
	this.base = "http://molgav.nn.ru/sf/";
	this.currentPath = this.base;
	//this.showFromSong = true;
	//this.showWhat = 0;
	this.showWhatRiff = 0;
	this.showWhatPosition = 1;
	this.showWhatSong = 2;
	this.showWhatLibrary = 3;
	this.binaryLoader = new BinaryLoader();
	this.preSelectedSampleId=null;
	this.itemFilter = new Item(lang.instruments(),lang.song(), function () {
			//console.log("filter");
			/*if (me.showFromSong) {
			me.showFromSong = false;
			me.itemFilter.description = "show whole library";
			} else {
			me.showFromSong = true;

			me.itemFilter.description = "show samples from song only";
			}*/
			if (isNaN(Number(app.song.showWhat))) {
				app.song.showWhat = me.showWhatLibrary;
			}
			app.song.showWhat++;
			if (app.song.showWhat > 3) {
				app.song.showWhat = me.showWhatRiff;
			}
			if (app.song.showWhat == me.showWhatRiff) {
				me.itemFilter.description = lang.oneRiff();
			} else {
				if (app.song.showWhat == me.showWhatPosition) {
					me.itemFilter.description = lang.slot();
				} else {
					if (app.song.showWhat == me.showWhatSong) {
						me.itemFilter.description = lang.song();
					} else {
						if (app.song.showWhat == me.showWhatLibrary) {
							me.itemFilter.description = lang.cloud();
						} else {
							console.log("app.song.showWhat:");
							console.log(app.song.showWhat);
							me.itemFilter.description = lang.error();
						}
					}
				}
			}
			me.refresh();
		}, function (context, x, y) {
			/*var n = 1;
			if (me.showFromSong) {
			n = 0;
			}*/
			//var n = 0 + app.song.showWhat;
			//if ((0 + app.song.showWhat) == NaN) {
			if (isNaN(0 + app.song.showWhat)) {
				app.song.showWhat = me.showWhatLibrary;
			}
			toolbox.drawSwitch(context, x, y, app.song.showWhat, 3);
			/*if (me.showFromSong) {
			context.lineWidth = 1;
			context.beginPath();
			context.arc(x + tapSize / 2, y + tapSize / 2, tapSize / 4, 0, Math.PI * 2);
			context.strokeStyle = "rgba(255,255,255,0.5)";
			context.stroke();
			context.beginPath();
			context.arc(x + tapSize / 2, y + tapSize / 2, tapSize / 4, 0, Math.PI);
			context.fillStyle = "rgba(255,255,255,0.5)";
			context.fill();
			} else {

			context.lineWidth = 1;
			context.beginPath();
			context.arc(x + tapSize / 2, y + tapSize / 2, tapSize / 4, 0, Math.PI * 2);
			context.fillStyle = "rgba(255,255,255,0.5)";
			context.fill();
			context.stroke();
			}*/
		});
	this.init = function () {
		console.log("MenuSamples.init");
		me.vertical = new Vertical();
		me.vertical.yAnchor=1.2*2*tapSize+0.5*tapSize;
		me.list = new List();
		//me.list.image=bgIns;
		//me.list.bgcolor = "rgba(24,16,16,0.9)";
		me.list.bgcolor = "rgba(16,0,16,0.5)";
		me.list.bgcolor2 = "rgba(16,0,16,0.99)";
		me.vertical.content = me.list;
		me.list.x = me.vertical.x + 0.5 * tapSize;
		app.renderer.layers[app.renderer.layers.length] = me.list;
		app.renderer.layers[app.renderer.layers.length] = me.vertical;
		me.refresh();
	};
	this.saveSettings = function (song) {
		song.settingsMenuSamplesX = me.vertical.x;
		song.settingsMenuSamplesY = me.vertical.y;
	};
	this.loadSettings = function (song) {

		console.log("MenuSamples.loadSettings");
		me.vertical.x = song.settingsMenuSamplesX;
		me.vertical.y = song.settingsMenuSamplesY;
		me.vertical.adjustBounds();
		me.list.x = me.vertical.x + 0.5 * tapSize;

	};
	this.promptVolume = function (songSample) {
		var items = [];
		items[items.length] = new Item("0%", "", function () {
				songSample.volume = 0;
				me.refresh();
			});
		items[items.length] = new Item("25%", "", function () {
				songSample.volume = 0.25;
				me.refresh();
			});
		items[items.length] = new Item("50%", "", function () {
				songSample.volume = 0.5;
				me.refresh();
			});
		items[items.length] = new Item("70%", "", function () {
				songSample.volume = 0.7;
				me.refresh();
			});
		items[items.length] = new Item("100%", "", function () {
				songSample.volume = 1.00;
				me.refresh();
			});
		app.promptSelect(lang.volume()+" " + Math.floor(songSample.volume * 100) + "%", items);
	};
	this.replaceCurrentPath=function(path){
		if (app.song.selectedRiffId == null) {
			app.promptWarning(lang.noSelectedRiff());
			return;
		}
		if (app.song.selectedSampleId == null) {
			app.promptWarning(lang.noSelectedInstrument());
			return;
		}
		app.promptConfirm("Replace "+app.song.selectedSampleId+ " of "+app.song.selectedRiffId+ " with "+path, function () {
			var smp=toolbox.addSampleToSong(path,app.song);
			toolbox.replaceSampleIdForRiff(toolbox.findRiffById(app.song.selectedRiffId,app.song),app.song.selectedSampleId,smp.id);
			toolbox.adjustSamples(app.song);
			me.refresh();
		});
	}
	this.replaceAllTo=function(toId){
		if (app.song.selectedRiffId == null) {
			app.promptWarning(lang.noSelectedRiff());
			return;
		}
		if (me.preSelectedSampleId == null) {
			app.promptWarning(lang.noSelectedInstrument());
			return;
		}
		app.promptConfirm("Replace all "+me.preSelectedSampleId+ " of "+app.song.selectedRiffId+ " with "+toId, function () {
			//console.log("replaceCurrentTo");
			for(var i=0;i<app.song.riffs.length;i++){
				toolbox.replaceSampleIdForRiff(app.song.riffs[i],me.preSelectedSampleId,toId);
			}
			me.refresh();
		});
	};
	this.replaceCurrentTo=function(toId){
		//console.log(toId);
		if (app.song.selectedRiffId == null) {
			app.promptWarning(lang.noSelectedRiff());
			return;
		}
		/*if (app.song.selectedSampleId == null) {
			app.promptWarning(lang.noSelectedInstrument());
			return;
		}*/
		
		if (me.preSelectedSampleId == null) {
			app.promptWarning(lang.noSelectedInstrument());
			return;
		}
		//var cuRiff=app.song.selectedRiffId;
		//var cuSa="sa";
		app.promptConfirm("Replace "+me.preSelectedSampleId+ " of "+app.song.selectedRiffId+ " with "+toId, function () {
			//console.log("replaceCurrentTo");
			toolbox.replaceSampleIdForRiff(toolbox.findRiffById(app.song.selectedRiffId,app.song),me.preSelectedSampleId,toId);
			me.refresh();
		});
	};
	this.transpose=function(diff,songRiff,sampleId){
		console.log(diff,songRiff,sampleId);
		for(var t=0;t<songRiff.tunes.length;t++){
			var songRiffTune=songRiff.tunes[t];			
			if(songRiffTune.sampleId==sampleId){
				console.log("found",songRiffTune);
				for (var s = 0; s < songRiffTune.steps.length; s++) {
					var chord=songRiffTune.steps[s];
					for (var p = 0; p < chord.length; p++) {
						var songRiffTunePoint=chord[p];
						songRiffTunePoint.pitch=songRiffTunePoint.pitch+diff;
					}
				}
			}
		}
		me.refresh();
	}
	this.promptTranspose=function(id){
		if (app.song.selectedRiffId == null) {
				app.promptWarning("Select riff before transposing");
				app.promptWarning(lang.noSelectedRiff());
				return;
			}
		if (id == null) {
		//if (app.song.selectedSampleId == null) {
			app.promptWarning(lang.noSelectedInstrument());
			return;
		}
		var riff=toolbox.findRiffById(app.song.selectedRiffId,app.song);
		var items = [];
		/*
		items[0] = new Item("+1", "", function(){me.transpose(+1,riff,app.song.selectedSampleId);});
		items[1] = new Item("-1", "", function(){me.transpose(-1,riff,app.song.selectedSampleId);});
		items[2] = new Item("+12", "", function(){me.transpose(+12,riff,app.song.selectedSampleId);});
		items[3] = new Item("-12", "", function(){me.transpose(-12,riff,app.song.selectedSampleId);});
		app.promptSelect("Transpose "+app.song.selectedSampleId+ " of "+app.song.selectedRiffId, items);
		*/
		items[0] = new Item("+1", "", function(){me.transpose(+1,riff,id);});
		items[1] = new Item("-1", "", function(){me.transpose(-1,riff,id);});
		items[2] = new Item("+12", "", function(){me.transpose(+12,riff,id);});
		items[3] = new Item("-12", "", function(){me.transpose(-12,riff,id);});
		app.promptSelect("Transpose "+id+ " of "+app.song.selectedRiffId, items);
	}
	this.onSelect = function (songSample) {
		//console.log("onSelect",songSample);
		var items = [];
		if (songSample.isDrum) {
			items[items.length] = new Item(lang.play(), "", function () {
					me.playDrum(songSample);
				});
		} else {
			
			me.selectBySample(songSample);
			me.refresh();
			items[items.length] = new Item(lang.play()+" 3C", "", function () {
					me.playSample(songSample, 36);
				});
			items[items.length] = new Item(lang.play()+" 4C", "", function () {
					me.playSample(songSample, 48);
				});
			items[items.length] = new Item(lang.play()+" 5C", "", function () {
					me.playSample(songSample, 60);
				});
			//playInCurrentSlot
			items[items.length] = new Item("Play instead of current instrument", "", function () {
					me.playInCurrentSlot(songSample);
				});
				/*
			items[items.length] = new Item(lang.select(), "", function () {
					me.selectBySample(songSample);
					me.refresh();
				});
				*/
			items[items.length] = new Item("Replace current instrument in current riff", "", function () {
					me.replaceCurrentTo(songSample.id);
					
				});
			items[items.length] = new Item("Replace current instrument in whole song", "", function () {
					me.replaceAllTo(songSample.id);
					
				});
			items[items.length] = new Item("Transpose", "", function () {
					//me.replaceCurrentTo(songSample.id);
					me.promptTranspose(songSample.id);
				});
		}
		items[items.length] = new Item(lang.volume()+" " + Math.floor(songSample.volume * 100) + "%", "", function () {
				me.promptVolume(songSample);
			});
		items[items.length] = new Item(lang.removeFromSong(), "", function () {
				me.promptRemove(songSample);
			});
		app.promptSelect(lang.sound(), items);
	};
	this.promptRemove = function (songSample) {
		app.promptConfirm(lang.areYouSure(), function () {
			if (songSample.isDrum) {
				me.promptRemoveDrum(songSample);
			} else {
				me.promptRemoveInstrument(songSample);
			}
		});
	};
	this.promptRemoveDrum = function (songSample) {
		console.log("promptRemoveDrum");
		for (var r = 0; r < app.song.riffs.length; r++) {
			var songRiff = app.song.riffs[r];
			for (var s = 0; s < songRiff.beat.length; s++) {
				var chord = songRiff.beat[s];
				for (var b = 0; b < chord.length; b++) {
					if (chord[b].sampleId == songSample.id) {
						app.song.selectedRiffId = songRiff.id;
						app.renderer.menuRiffs.showAll = true;
						for (var p = 0; p < app.song.positions.length; p++) {
							var songPosition = app.song.positions[p];
							for (var rid = 0; rid < songPosition.riffIds.length; rid++) {
								if (songPosition.riffIds[rid] == songRiff.id) {
									app.renderer.menuRiffs.showAll = false;
									app.showPosition(songPosition);
									app.promptWarning(lang.drumUsed());
									return;
								}
							}
						}
						app.promptWarning(lang.drumUsed());
						return;
					}
				}
			}
		}
		for (var i = 0; i < app.song.samples.length; i++) {
			if (app.song.samples[i].id == songSample.id) {
				//console.log("remove");
				app.song.samples.splice(i, 1);
				me.refresh();
				return;
			}
		}
	};
	this.promptRemoveInstrument = function (songSample) {
		console.log("promptRemoveInstrument");
		for (var r = 0; r < app.song.riffs.length; r++) {
			var songRiff = app.song.riffs[r];
			for (var t = 0; t < songRiff.tunes.length; t++) {
				var songRiffTune = songRiff.tunes[t];
				if (songRiffTune.sampleId == songSample.id) {
					app.song.selectedRiffId = songRiff.id;
					app.song.selectedSampleId = songRiff.id;
					app.renderer.menuRiffs.showAll = true;
					for (var p = 0; p < app.song.positions.length; p++) {
						var songPosition = app.song.positions[p];
						for (var rid = 0; rid < songPosition.riffIds.length; rid++) {
							if (songPosition.riffIds[rid] == songRiff.id) {
								app.renderer.menuRiffs.showAll = false;
								app.showPosition(songPosition);
								app.promptWarning(lang.instrumentUsed()+" at riff "+songRiff.id);
								return;
							}
						}
					}
					app.promptWarning(lang.instrumentUsed()+" at riff "+songRiff.id);
					return;
				}
			}
		}
		for (var i = 0; i < app.song.samples.length; i++) {
			if (app.song.samples[i].id == songSample.id) {
				app.song.selectedSampleId = null;
				app.song.samples.splice(i, 1);
				me.refresh();
				return;
			}
		}
	};
	this.selectByPath = function (path, isDrum, midi) {
		console.log(path);
		var s = toolbox.findSampleByPath(path, app.song);
		if (s == null) {
			var songSample = toolbox.addSampleToSong(path, app.song);
			if (isDrum) {
				songSample.isDrum = true;
			} else {
				songSample.isDrum = false;
				app.song.selectedSampleId = songSample.id;
			}
			songSample.midi = midi;
			toolbox.adjustSamples(app.song);
		} else {
			if (!isDrum) {
				app.song.selectedSampleId = s.id;
			}
		}
		//console.log(toolbox.findSampleById(app.song.selectedSampleId, app.song));

		me.refresh();
	};
	this.selectBySample = function (songSample) {
		//console.log(sample);
		//if(app.song.selectedSampleId!=null){
			me.preSelectedSampleId=app.song.selectedSampleId
		//}
		app.song.selectedSampleId = songSample.id;
	};
	this.playInCurrentSlot = function (newInstrument) {
		var fromPosition=toolbox.findPosition(app.song.selectedPositionId,app.song);
		if(fromPosition!=null){
			//var instrument=toolbox.findSampleById(app.song.selectedSampleId,app.song);
			var instrument=toolbox.findSampleById(me.preSelectedSampleId,app.song);
			if(instrument!=null){
				if(!instrument.isDrum){
					var newSong = new Song();
					newSong.meter = app.song.meter;
					newSong.tempo = app.song.tempo;
					var newPosition = toolbox.getPositionFromSong(0, 0, newSong);
					//console.log("playInCurrentSlot",fromPosition);
					for(var i=0;i<fromPosition.riffIds.length;i++){
						var rid=fromPosition.riffIds[i];
						var fromRiff=toolbox.findRiffById(rid,app.song)
						var newRiff=toolbox.createRiffClone(fromRiff,newSong);
						newPosition.riffIds[newPosition.riffIds.length]=newRiff.id;
						for (var t = 0; t < newRiff.tunes.length; t++) {
							var songRiffTune = newRiff.tunes[t];
							//var tune = new SongRiffTune();
							if(songRiffTune.sampleId==instrument.id){
								//console.log();
								songRiffTune.sampleId=newInstrument.id
							}
							//tune.sampleId = songRiffTune.sampleId;
							}
					}
					newSong.samples=app.song.samples.slice(0);
					//toolbox.addSampleToSong(newInstrument.path, newSong);
					newSong.samples[newSong.samples.length]=newInstrument;
					toolbox.adjustSample(newInstrument);
					//console.log(newInstrument);
					
					app.playSong(newSong);
				}else{
					app.promptWarning("Not an instrument");
				}
			}else{
				app.promptWarning("No selected instrument");
			}
		}else{
			app.promptWarning("No selected slot");
		}
	}
	this.playSample = function (s, p) {
		var song = new Song();
		song.meter = 16;
		song.tempo = 120;
		var songPosition = toolbox.getPositionFromSong(0, 0, song);
		var songRiff = new SongRiff();
		var songRiffTune = new SongRiffTune();
		var songSample = toolbox.addSampleToSong(s.path, song);
		songRiffTune.sampleId = songSample.id;
		toolbox.addTuneToRiff(songRiffTune, songRiff);
		toolbox.addRiffToSong(songRiff, song);
		toolbox.addRiffIdToPosition(songRiff.id, songPosition);
		toolbox.setTunePointToTune(0, p, 12, 0, songRiffTune);
		app.playSong(song);
	};
	this.playDrum = function (s) {
		console.log(s);
		var song = new Song();
		song.meter = 8;
		song.tempo = 120;
		var songPosition = toolbox.getPositionFromSong(0, 0, song);
		var songRiff = new SongRiff();
		var songRiffTune = new SongRiffTune();
		var songSample = toolbox.addSampleToSong(s.path, song);
		songRiffTune.sampleId = songSample.id;
		toolbox.addTuneToRiff(songRiffTune, songRiff);
		toolbox.addRiffToSong(songRiff, song);
		toolbox.addRiffIdToPosition(songRiff.id, songPosition);
		toolbox.setBeatPointToRiff(0, songSample.id, songRiff);
		app.playSong(song);
	};
	this.refreshSongSamples = function () {
		//console.log("refreshSongSamples "+app.song.samples.length+"/"+app.song.showWhat+"/"+me.showWhatSong);
		var smpls = [];
		var nn = app.song.showWhat;
		var currentRiff = toolbox.findRiffById(app.song.selectedRiffId, app.song);
		var currentPosition = toolbox.findPosition(app.song.selectedPositionId, app.song);
		for (var i = 0; i < app.song.samples.length; i++) {
			if (app.song.showWhat == me.showWhatSong) {
				smpls[smpls.length] = app.song.samples[i];
			} else {
				if (app.song.showWhat == me.showWhatPosition) {
					//console.log(currentPosition);
					if (currentPosition) {
						if (toolbox.existsSampleIdInPosition(app.song.samples[i].id, currentPosition, app.song)) {
							smpls[smpls.length] = app.song.samples[i];
						}
					}
				} else {
					if (app.song.showWhat == me.showWhatRiff) {
						if (currentRiff) {
							if (toolbox.existsSampleIdInRiff(app.song.samples[i].id, currentRiff)) {
								smpls[smpls.length] = app.song.samples[i];
								/*if(!app.song.samples[i].isDrum){
									app.song.selectedSampleId=app.song.samples[i].id;
								}*/
							}
						}
					}
				}
			}
		}
		console.log("refreshSongSamples fill "+smpls.length);
		for (var i = 0; i < smpls.length; i++) {
			var songSample = smpls[i];
			//console.log(songSample);
			var name = "?";
			if (songSample.isDrum) {
				name = toolbox.drumNames[songSample.midi];
			} else {
				name = toolbox.insNames[songSample.midi];
			}
			var subPath="";
			if(songSample.path){
				subPath=songSample.path.substring(me.base.length);
			}
			var item = new Item(name //
				, Math.floor(songSample.volume * 100) + "%, " + subPath, function () {
					//console.log(this.songSample);
					me.onSelect(this.songSample);
				}, function (context, x, y) {
					var color = this.songSample.color;
					context.globalAlpha = 0.5;
					if (this.songSample.isDrum) {
						context.beginPath();
						context.arc(x + tapSize / 2, y + tapSize / 2, tapSize / 6, 0, Math.PI * 2);
						context.fillStyle = color;
						context.fill();
					} else {
						/*
						context.beginPath();
						context.arc(x + tapSize / 2, y + tapSize / 2, tapSize / 6, 0, Math.PI * 2);
						context.fillStyle = color;
						context.fill();
						context.closePath();*/
						context.beginPath();
						context.lineCap = "round";
						context.lineWidth = tapSize / 3;
						context.strokeStyle = color;
						context.moveTo(x + tapSize / 2, y + tapSize / 2);
						context.lineTo(x + 2 * tapSize / 3, y + tapSize / 3);
						context.stroke();
						context.closePath();
						//console.log(app.song.selectedSampleId + " ? " + this.songSample.id);
						//if (app.song.selectedSampleId == this.songSample.id) {
						if (this.selected) {
							//console.log("found");
							context.globalAlpha = 1;
							context.beginPath();
							context.arc(x + tapSize / 2, y + tapSize / 2, tapSize / 6, 0, Math.PI * 2);
							context.fillStyle = color;
							context.fill();
							context.closePath();
						}
					}
					context.lineWidth = 1;
					context.globalAlpha = 1;
				});

			item.songSample = songSample;
			if (app.song.selectedSampleId == item.songSample.id) {
				item.selected = true;
			} else {
				item.selected = false;
			}
			me.list.add(item);
		}
		console.log("done refreshSongSamples");
	};

	this.onloadCallback = function () {
		var folder = "";
		if (me.currentPath != me.base) {
			folder = me.currentPath.substr(me.base.length);
			me.list.add(new Item("up", folder, function () {
					var folders = me.currentPath.split("/");
					var path = "";
					for (var i = 0; i < folders.length - 2; i++) {
						path = path + folders[i] + "/";
					}
					me.currentPath = path;
					me.refresh();
				}, toolbox.iconUp));
		}
		var rows = me.binaryLoader.html.split("<a href=\"");
		var parts = null;
		for (var i = 6; i < rows.length; i++) {
			parts = rows[i].split("\">");
			if (parts.length > 0) {
				var caption = "";
				var description = "";
				var icon = null;
				var action = null;
				//var _path="";
				var _midi = 0;
				var fullPath = "";
				if (parts[0].trim().charAt(parts[0].length - 1) != '/') { //file
					description = parts[0];
					fullPath = me.currentPath + parts[0];
					if (folder.substr(0, 4) == "drum") {
						var s = parts[0].split("_");
						var n = s[1].split("-");
						//console.log(s);
						var n2 = parseInt([n[0]]);
						if (n2 < 35 || n2 > 81) {
							caption = "drum";
						} else {
							caption = toolbox.drumNames[n2];
						}
						_midi = n2;
						//caption=n+"/"+n2;
						icon = function (context, x, y) {
							context.globalAlpha = 0.5;
							context.beginPath();
							context.arc(x + tapSize / 2, y + tapSize / 2, tapSize / 6, 0, Math.PI * 2);
							context.fillStyle = "#ffffff";
							context.fill();
							context.globalAlpha = 1;
						};
						action = function () {
							//console.log(this);
							me.promptDrum(this.fullPath, this.midi1);
						};
					} else {
						var s = me.currentPath.split("/");
						_midi = parseInt(s[s.length - 3]);
						//console.log(_midi+" ------------------------- "+s);
						icon = function (context, x, y) {
							//console.log(this.description);
							context.globalAlpha = 0.5;
							context.beginPath();
							context.lineCap = "round";
							context.lineWidth = tapSize / 3;
							var d = this.name1;
							var m = this.midi1;
							context.strokeStyle = toolbox.calculateColor(d, m);
							//context.strokeStyle = toolbox.calculateNoteColor(1,d, m,0);
							
							context.moveTo(x + tapSize / 2, y + tapSize / 2);
							context.lineTo(x + 2 * tapSize / 3, y + tapSize / 3);
							context.stroke();
							context.closePath();
							context.globalAlpha = 1;
							context.lineWidth = 2;
						};
						action = function () {
							//console.log(this);
							me.promptInstrument(this.fullPath, this.midi1);
						};
						/*_path = parts[0];
						_midi = 0;
						console.log(_path);
						console.log(_midi);
						icon.samplePath = _path;
						icon.sampleMidi = _midi;*/
					}
					//var p=me.currentPath + parts[0];

				} else {
					caption = parts[0].substr(0, parts[0].length - 1); //parts[0];
					if (me.currentPath == me.base + "instruments/") {
						var n = parseInt(parts[0].substr(0, parts[0].length - 1));
						description = toolbox.insNames[n];
					}
					icon = toolbox.iconFolder;
					action = function () {
						me.currentPath = me.currentPath + this.selectedName;
						me.refresh();
					};
				}
				var item = new Item(caption, description, action, icon);
				item.selectedName = parts[0];
				item.name1 = parts[0];
				item.midi1 = _midi;
				item.fullPath = fullPath;
				me.list.add(item);
			}
		}
		me.list.y = 0;
		app.renderer.fireRender();
	};
	this.promptInstrument = function (path, midi) {
		var items = [];

		items[items.length] = new Item(lang.play()+" 3C", "", function () {
				var sample = new SongSample();
				sample.path = path;
				sample.isDrum = false;
				me.playSample(sample, 36);
			});
		items[items.length] = new Item(lang.play()+" 4C", "", function () {
				var sample = new SongSample();
				sample.path = path;
				sample.isDrum = false;
				me.playSample(sample, 48);
			});
		items[items.length] = new Item(lang.play()+" 5C", "", function () {
				var sample = new SongSample();
				sample.path = path;
				sample.isDrum = false;
				me.playSample(sample, 60);
			});
		
		items[items.length] = new Item("Play instead of selected instrument", "", function () {
				me.preSelectedSampleId=app.song.selectedSampleId
				var sample = new SongSample();
				sample.path = path;
				sample.isDrum = false;
				me.playInCurrentSlot(sample);
			});
		items[items.length] = new Item("Add instrument to song", "", function () {
				//me.showFromSong = true;
				app.song.showWhat = me.showWhatRiff;
				me.selectByPath(path, false, midi);
				me.refresh();
			});
		items[items.length] = new Item("Load and replace current instrument in current riff", "", function () {	
				me.replaceCurrentPath(path);
				
			});
		app.promptSelect("Sound", items);
	};
	this.promptDrum = function (path, midi) {
		var items = [];
		items[items.length] = new Item(lang.play(), "", function () {
				var sample = new SongSample();
				sample.path = path;
				sample.isDrum = true;
				me.playDrum(sample);
			});
		items[items.length] = new Item(lang.select(), "", function () {
				//me.showFromSong = true;
				app.song.showWhat = me.showWhatRiff;
				me.selectByPath(path, true, midi);
				me.refresh();
			});
		app.promptSelect(lang.sound(), items);
	};
	this.onerrorCallback = function () {

		console.log("ops");
		console.log(me.binaryLoader.error);
		me.list.add(new Item(lang.refresh(), "", function () {
				me.currentPath = me.base;
				me.refresh();
			}));
		app.renderer.fireRender();
		app.promptWarning(lang.error());
	};
	this.refreshLibrarySamples = function () {

		me.binaryLoader.read(me.currentPath // "http://www.javafx.me/midi/"//
		, me.onloadCallback //
		, me.onerrorCallback);

	};
	this.refresh = function () {
		me.list.items.splice(0, me.list.items.length);
		me.list.add(this.itemFilter);
		if (app.song.showWhat == me.showWhatLibrary) {
			me.refreshLibrarySamples();
		} else {

			me.refreshSongSamples();
		}
	}
	return this;
}
function MenuSlot() {
	var me = this;
	/*this.menuItemShowSong = new Item("Show song", "", function () {
	app.showSong();
	});
	this.menuItemShowPosition = new Item("Show selected position", "", function () {
	app.showPosition(toolbox.findPosition(app.song.selectedPositionId,app.song));
	});*/

	this.menuItemPlay = new Item(lang.play(), "", function () {
			if (app.playOn || app.testPlayOn) {
				stopPlay();
			} else {
				if (!app.renderer.panelPosition.visibled) {
					//
					if (app.mixerMode == 1 || app.mixerMode == 3) { //app.mixRealTime){
						app.lockedSlot = null;
						app.testPlay();
					} else {
						app.playSong(app.song);
					}
				} else { //me.lockedSlot = slot;
					if (app.mixerMode == 1 || app.mixerMode == 3) { //app.mixRealTime){
						app.lockedSlot = toolbox.findPosition(app.song.selectedPositionId, app.song);
						app.testPlay();
						app.renderSlotStep = true;
					} else {
						app.playPosition(toolbox.findPosition(app.song.selectedPositionId, app.song));
					}
				}
			}
		}, toolbox.iconPlayStart);
	this.menuItemImport = new Item(lang.importMid(), "", function () {
			//app.promptWarning(lang.notYetAvailable());
			document.getElementById("importDiv").style.visibility = 'visible';
		});

	this.menuItemOpen = new Item(lang.openSong(), "", function () {
			//app.promptWarning(lang.notYetAvailable());
			document.getElementById("openSong").style.visibility = 'visible';
		});

	this.menuItemMerge = new Item(lang.mergeRiffs(), "", function () {
			document.getElementById("mergeRiffs").style.visibility = 'visible';
		});

	/*this.menuItemTest1 = new Item("test", "Item for testing", function () {
	console.log("tap test");

	});
	this.menuItemTest2 = new Item("test 2", "rename menu item 1", function () {
	console.log("tap test 2");
	me.menuItemTest1.caption = "t111111";
	me.menuItemTest1.description = "zdrbfszdfbzdfbzdfb";
	});*/
	this.menuItemTempo = new Item(lang.tempo(), "", function () {
			stopPlay();
			/*var items = [];
			items[items.length] = new Item("40", "", function () {
			app.song.tempo = 40;
			me.refresh();
			});
			items[items.length] = new Item("90", "", function () {
			app.song.tempo = 90;
			me.refresh();
			});
			items[items.length] = new Item("120", "", function () {
			app.song.tempo = 120;
			me.refresh();
			});
			items[items.length] = new Item("160", "", function () {
			app.song.tempo = 160;
			me.refresh();
			});
			items[items.length] = new Item("200", "", function () {
			app.song.tempo = 200;
			me.refresh();
			});
			items[items.length] = new Item("240", "", function () {
			app.song.tempo = 240;
			me.refresh();
			});*/
			if (app.song.tempo == 40) {
				app.song.tempo = 80;
			} else {
				if (app.song.tempo == 80) {
					app.song.tempo = 100;
				} else {
					if (app.song.tempo == 100) {
						app.song.tempo = 120;
					} else {
						if (app.song.tempo == 120) {
							app.song.tempo = 140;
						} else {
							if (app.song.tempo == 140) {
								app.song.tempo = 160;
							} else {
								if (app.song.tempo == 160) {
									app.song.tempo = 180;
								} else {
									if (app.song.tempo == 180) {
										app.song.tempo = 200;
									} else {
										if (app.song.tempo == 200) {
											app.song.tempo = 240;
										} else {
											app.song.tempo = 40;
										}
									}
								}
							}
						}
					}
				}
			}
			//console.log(app.song.tempo);
			app.renderer.menuSlot.refresh();
			//app.promptSelect(lang.tempo() + " " + app.song.tempo + " bpm", items);
		},
			function (context, x, y) {
			var n = 0;
			if (app.song.tempo > 40) {
				n = 1;
			}
			if (app.song.tempo > 80) {
				n = 2;
			}
			if (app.song.tempo > 100) {
				n = 3;
			}
			if (app.song.tempo > 120) {
				n = 4;
			}
			if (app.song.tempo > 140) {
				n = 5;
			}
			if (app.song.tempo > 160) {
				n = 6;
			}
			if (app.song.tempo > 180) {
				n = 7;
			}
			if (app.song.tempo > 200) {
				n = 8;
			}
			toolbox.drawSwitch(context, x, y, n, 8);
		});
	this.menuItemMeter = new Item(lang.meter() + " " + app.song.meter + " /16", "", function () {
			stopPlay();
			/*var items = [];
			items[items.length] = new Item("16 /16", "", function () {
			app.song.meter = 16;
			me.refresh();
			});
			items[items.length] = new Item("32 /16", "", function () {
			app.song.meter = 32;
			me.refresh();
			});
			items[items.length] = new Item("64 /16", "", function () {
			app.song.meter = 64;
			me.refresh();
			});
			items[items.length] = new Item("24 /16", "", function () {
			app.song.meter = 24;
			me.refresh();
			});
			items[items.length] = new Item("48 /16", "", function () {
			app.song.meter = 48;
			me.refresh();
			});
			app.promptSelect(lang.meter() + " " + app.song.meter + " /16", items);
			 */
			if (app.song.meter == 16) {
				app.song.meter = 24;
			} else {
				if (app.song.meter == 24) {
					app.song.meter = 32;
				} else {
					if (app.song.meter == 32) {
						app.song.meter = 40;
					} else {
						if (app.song.meter == 40) {
							app.song.meter = 48;
						} else {
							if (app.song.meter == 48) {
								app.song.meter = 64;
							} else {
								app.song.meter = 16;
							}
						}
					}
				}
			}
			me.refresh();
		},
			function (context, x, y) {
			var n = 0;
			if (app.song.meter > 16) {
				n = 1;
			}
			if (app.song.meter > 24) {
				n = 2;
			}
			if (app.song.meter > 32) {
				n = 3;
			}
			if (app.song.meter > 40) {
				n = 4;
			}
			if (app.song.meter > 48) {
				n = 5;
			}
			toolbox.drawSwitch(context, x, y, n, 5);
		});

	this.menuItemColors = new Item(lang.color() + " " + lang.colorModeName(app.song.colorMode), "", function () {
			var items = [];
			items[items.length] = new Item(lang.colorModeName(0), "", function () {
					//console.log(0);
					app.song.colorMode = 0;
					me.refresh();
				});
			items[items.length] = new Item(lang.colorModeName(1), "", function () {
					//console.log(1);
					app.song.colorMode = 1;
					me.refresh();
				});
			items[items.length] = new Item(lang.colorModeName(2), "", function () {
					//console.log(2);
					app.song.colorMode = 2;
					me.refresh();
				});
			items[items.length] = new Item(lang.colorModeName(3), "", function () {
					//console.log(3);
					app.song.colorMode = 3;
					me.refresh();
				});
			items[items.length] = new Item(lang.colorModeName(4), "", function () {
					//console.log(4);
					app.song.colorMode = 4;
					me.refresh();
				});
			items[items.length] = new Item(lang.colorModeName(5), "", function () {
					//console.log(5);
					app.song.colorMode = 5;
					me.refresh();
				});
			items[items.length] = new Item(lang.colorModeName(6), "", function () {
					//console.log(6);
					app.song.colorMode = 6;
					me.refresh();
				});
			items[items.length] = new Item(lang.colorModeName(7), "", function () {
					//console.log(7);
					app.song.colorMode = 7;
					me.refresh();
				});
			items[items.length] = new Item(lang.colorModeName(8), "", function () {
					//console.log(8);
					app.song.colorMode = 8;
					me.refresh();
				});
			items[items.length] = new Item(lang.colorModeName(9), "", function () {
					//console.log(9);
					app.song.colorMode = 9;
					me.refresh();
				});
			items[items.length] = new Item(lang.colorModeName(10), "", function () {
					//console.log(10);
					app.song.colorMode = 10;
					me.refresh();
				});
			items[items.length] = new Item(lang.colorModeName(11), "", function () {
					//console.log(11);
					app.song.colorMode = 11;
					me.refresh();
				});
			items[items.length] = new Item(lang.colorModeName(12), "", function () {
					//console.log(12);
					app.song.colorMode = 12;
					me.refresh();
				});
			app.promptSelect(lang.color() + " " + lang.colorModeName(app.song.colorMode), items);
		});
	this.promptClearWholeSong = function () {
		app.promptConfirm("Clear, create new song, add default instruments and drums", function () {
			app.showSong();
			var _showWhat = app.song.showWhat;
			app.song = new Song();
			app.song.showWhat = _showWhat;
			toolbox.addSampleToSong("http://molgav.nn.ru/sf/instruments/001/Chaos_000/000_000-034_60_-3100_8-56403_22050", app.song);
			toolbox.addSampleToSong("http://molgav.nn.ru/sf/instruments/014/Fluid_000/000_000-066_60_-8400_61072-62484_44100", app.song);
			toolbox.addSampleToSong("http://molgav.nn.ru/sf/instruments/018/Fluid_000/000_000-044_60_-4400_23350-72007_32000", app.song);
			toolbox.addSampleToSong("http://molgav.nn.ru/sf/instruments/019/Fluid_000/000_000-036_36_-3600_24522-61248_22050", app.song);
			toolbox.addSampleToSong("http://molgav.nn.ru/sf/instruments/023/Fluid_000/000_000-060_60_-6000_36629-182237_22050", app.song);
			toolbox.addSampleToSong("http://molgav.nn.ru/sf/instruments/027/Fluid_000/000_000-044_60_-4000_35331-35859_22050", app.song);
			toolbox.addSampleToSong("http://molgav.nn.ru/sf/instruments/029/Sss/041_028-028_60_-2700_8-388808_44100", app.song);
			toolbox.addSampleToSong("http://molgav.nn.ru/sf/instruments/029/Sss/046_028-028_60_-2700_8-51737_44100", app.song);
			toolbox.addSampleToSong("http://molgav.nn.ru/sf/instruments/030/Kamac_000/000_028-039_60_-3800_21630-21930_22050", app.song);
			toolbox.addSampleToSong("http://molgav.nn.ru/sf/instruments/031/GuitarFX_000/002_000-127_60_-6000_8-11383_22050", app.song);
			toolbox.addSampleToSong("http://molgav.nn.ru/sf/instruments/031/GuitarFX_000/005_000-127_60_-6400_8-6783_22050", app.song);
			toolbox.addSampleToSong("http://molgav.nn.ru/sf/instruments/031/GuitarFX_000/008_000-127_60_-7800_8-35163_22050", app.song);
			toolbox.addSampleToSong("http://molgav.nn.ru/sf/instruments/032/Fluid_000/000_000-028_60_-2800_76560-78701_44100", app.song);
			toolbox.addSampleToSong("http://molgav.nn.ru/sf/instruments/033/Fluid_000/000_000-028_60_-2800_84046-84581_22050", app.song);
			toolbox.addSampleToSong("http://molgav.nn.ru/sf/instruments/035/Chaos_000/000_000-049_60_-3800_18732-19937_44100", app.song);
			toolbox.addSampleToSong("http://molgav.nn.ru/sf/instruments/036/Chaos_000/001_038-127_60_-4300_8-25976_44100", app.song);
			toolbox.addSampleToSong("http://molgav.nn.ru/sf/instruments/039/Chaos_000/000_000-032_60_-3600_8-6958_22050", app.song);
			toolbox.addSampleToSong("http://molgav.nn.ru/sf/instruments/040/Fluid_000/000_000-058_60_-5600_55974-64117_44100", app.song);
			toolbox.addSampleToSong("http://molgav.nn.ru/sf/instruments/043/Fluid_000/000_000-029_60_-2900_42549-52721_44100", app.song);
			toolbox.addSampleToSong("http://molgav.nn.ru/sf/instruments/045/Fluid_000/000_000-037_60_-3600_8-77560_32000", app.song);
			toolbox.addSampleToSong("http://molgav.nn.ru/sf/instruments/052/Fluid_000/000_000-039_60_-3900_38712-65958_32000", app.song);
			toolbox.addSampleToSong("http://molgav.nn.ru/sf/instruments/055/Fluid_000/000_000-068_60_-6800_8-37084_44100", app.song);
			toolbox.addSampleToSong("http://molgav.nn.ru/sf/instruments/060/Fluid_000/000_041-046_60_-4500_38855-95853_32000", app.song);
			toolbox.addSampleToSong("http://molgav.nn.ru/sf/instruments/075/Fluid_000/000_000-055_60_-5400_14173-21278_18000", app.song);
			toolbox.addSampleToSong("http://molgav.nn.ru/sf/instruments/104/Fluid_000/000_000-054_60_-5200_28998-31674_44100", app.song);
			toolbox.addSampleToSong("http://molgav.nn.ru/sf/instruments/126/Fluid_000/000_000-127_60_-6000_72192-128516_44100", app.song);
			toolbox.addSampleToSong("http://molgav.nn.ru/sf/instruments/127/SynthGMS_000/002_000-117_60_-9600_7-5392_44100", app.song);
			toolbox.addSampleToSong("http://molgav.nn.ru/sf/drums/000/Chaos_128/002_036-036_60_-3600.0_8-6995_44100", app.song);
			toolbox.addSampleToSong("http://molgav.nn.ru/sf/drums/000/Chaos_128/004_038-038_60_-3800.0_8-17828_44100", app.song);
			toolbox.addSampleToSong("http://molgav.nn.ru/sf/drums/000/Chaos_128/005_039-039_60_-3900.0_8-25353_44100", app.song);
			toolbox.addSampleToSong("http://molgav.nn.ru/sf/drums/000/Chaos_128/059_042-042_60_-4200.0_8-6826_32000", app.song);
			toolbox.addSampleToSong("http://molgav.nn.ru/sf/drums/000/Chaos_128/008_043-043_60_-4300.0_8-48513_44100", app.song);
			toolbox.addSampleToSong("http://molgav.nn.ru/sf/drums/000/Chaos_128/060_044-044_60_-4400.0_8-2902_32000", app.song);
			toolbox.addSampleToSong("http://molgav.nn.ru/sf/drums/000/Chaos_128/061_046-046_60_-4600.0_8-34789_32000", app.song);
			toolbox.addSampleToSong("http://molgav.nn.ru/sf/drums/000/Chaos_128/011_047-047_60_-4700.0_8-48791_44100", app.song);
			toolbox.addSampleToSong("http://molgav.nn.ru/sf/drums/000/Chaos_128/013_050-050_60_-5000.0_8-30531_44100", app.song);
			toolbox.addSampleToSong("http://molgav.nn.ru/sf/drums/000/Chaos_128/021_056-056_60_-5600.0_8-2866_44100", app.song);
			toolbox.addSampleToSong("http://molgav.nn.ru/sf/drums/000/Chaos_128/022_057-057_60_-5700.0_8-109440_44100", app.song);
			toolbox.addSampleToSong("http://molgav.nn.ru/sf/drums/000/Chaos_128/024_059-059_60_-5900.0_8-90666_44100", app.song);
			toolbox.adjustSamples(app.song);
			//app.song.showWhat=1;
			//app.renderer.menuRiffs.refresh();
			//app.renderer.menuSamples.refresh();
			//app.showPosition(slot);
			app.renderer.refreshSong();
			var p = toolbox.getPositionFromSong(0, 0, app.song);
			app.showPosition(p);
			//app.song.selectedPositionId
			app.renderer.menuSamples.refresh();
		});
	};
	this.promptClearUnused = function () {
		app.promptConfirm("Clear unused instruments and riffs", function () {
			//menuRiffs.deleteRiffFromSong(songRiff);
			for (var i = 0; i < app.song.riffs.length; i++) {
				var songRiff = app.song.riffs[i];
				var songPosition = app.renderer.menuRiffs.deleteUnusedRiffFromSong(songRiff, app.song);
				if (songPosition) {
					//
				} else {
					i--;
				}
			}
			for (var i = 0; i < app.song.samples.length; i++) {
				var songSample = app.song.samples[i];
				var unused = true;
				for (var r = 0; r < app.song.riffs.length; r++) {
					var songRiff = app.song.riffs[r];
					if (songSample.isDrum) {
						//menuSamples.promptRemoveDrum(songSample);
						if (toolbox.existsBeatIdInRiff(songSample.id, songRiff)) {
							unused = false;
							break;
						}
					} else {
						//menuSamples.promptRemoveInstrument(songSample);
						if (toolbox.existsInstrumentIdInRiff(songSample.id, songRiff)) {
							unused = false;
							break;
						}
					}
				}
				if (unused) {
					app.song.samples.splice(i, 1);
					i--;
				}
			}
			app.renderer.menuRiffs.refresh();
			app.renderer.menuSamples.refresh();
		});
	};
	this.menuClearAll = new Item(lang.clearAll(), "", function () {
			var items = [];
			items[items.length] = new Item("Clear song", "", function () {
					me.promptClearWholeSong();
				});
			items[items.length] = new Item("Clear unused instruments and riffs", "", function () {
					me.promptClearUnused();
				});
			app.promptSelect("Clear", items);
		});
	this.menuShare = new Item("Share via", "Facebook, Twitter, e-mail, etc", function () {
			//window.open("mailto:sss1024@gmail.com?subject=Triton " + buildVersion, "_self");
			//window.open("tupload.php", "_self");


			var url = "jupload.php";

			for (var i = 0; i < app.song.samples.length; i++) {
				try {
					app.song.samples[i].signed = null;
				} catch (e) {
					console.log(e);
				}
			}
			//--------------
			

			//var img    = app.renderer.scoreCanvas.toDataURL("image/png");

			//var i2=can1.toDataURL("image/png");
			//document.write('<img src="'+img+'"/>');
			//window.open(i2);
			//---------------


			var sn = JSON.stringify(app.song); ;
			var blob = new Blob([sn], {
					type : 'text/plain'
				});
			//oReq.send(blob);


			var oReq = new XMLHttpRequest();

			var formData = new FormData();
			formData.append("fileToUploadName", blob);
			oReq.open("POST", url, true);
			oReq.onload = function (oEvent) {
				console.log("onload", oEvent.target.responseText);
				//alert(oEvent.target.responseText);
				var txt = oEvent.target.responseText;
				
				try {
					var ow = app.renderer.scoreCanvas.width;
					var oh = app.renderer.scoreCanvas.height;
					var ratio = ow / oh;
					var nw = 320;
					if(ow>640){
						nw=640;
					}
					if(ow>1000){
						nw=800;
					}
					var nh = nw / ratio;
					console.log(ow, oh, nw, nh);
					var can1 = document.createElement('canvas');
					can1.width = nw;
					can1.height = nh;
					var ctx1 = can1.getContext('2d');
					ctx1.drawImage(app.renderer.scoreCanvas, 0, 0, nw, nh);
					var i2 = can1.toDataURL("image/png");
					var iurl = "http://molgav.nn.ru/iupload.php";
					var http = new XMLHttpRequest();
					var params = "imageData=" + i2;
					http.open("POST", iurl, true);
					http.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
					/*http.onreadystatechange = function () {
						console.log('onreadystatechange', http);
					}*/
					http.onload = function (ev) {
						var itxt = ev.target.responseText;
						window.open("tupload.php?to=" + txt+"&i="+itxt, "_self");
					}
					http.onerror = function (ev) {
						window.open("tupload.php?to=" + txt, "_self");
					}
					http.send(params);
				} catch (ex) {
					console.log(ex);
					window.open("tupload.php?to=" + txt, "_self");
				}

				//window.open("tupload.php?to=" + txt, "_self");
				// Uploaded.
			};
			oReq.send(formData);

			/*
			var blob = new Blob(["{\"id\":\"912579\",\"tempo\":120,\"meter\":32,\"comment\":\"\",\"positions\":[],\"riffs\":["], {type: 'text/plain'});
			var input = document.getElementById("fileToUploadId");
			//input.setAttribute("value", blob);
			input.files[0]=blob;
			document.getElementById("filesForm").submit();
			 */
		});
	this.menuLib = new Item("Library", "open library", function () {
			//window.open("mailto:sss1024@gmail.com?subject=Triton " + buildVersion, "_self");
			window.open("liblist.php", "_self");
		});

	this.menuFeedback = new Item("Feedback", "support@molgav.nn.ru", function () {
			//window.open("mailto:sss1024@gmail.com?subject=Triton " + buildVersion, "_self");
			window.open("mailto:support@molgav.nn.ru?subject=Molgav " + buildVersion, "_self");
		});
	this.menuHelp = new Item(lang.help(), "build " + buildVersion, function () {
			//window.open("http://www.youtube.com/watch?v=fFHAbNmERow", "_self");
			//window.open("http://www.youtube.com/watch?v=grnfcVSw0RM", "_self");
			//window.open("help/index.html", "_self");
			//window.open("http://www.reddit.com/r/molgav/","_self");
			window.open("rtfm/index.html", "_self");
			//test2();
			//app.renderer.saveSettings(app.song);
			//var saveText=JSON.stringify(app.song);
			//console.log(saveText);
		});
	//app.mixerMode
	this.mixDescription = function (n) {
		if (n == 3) {
			return "by timeline";
		} else {
			if (n == 2) {
				return "synchronous before playing";
			} else {
				return "asynchronous while playing";
			}
		}
	};
	/*this.tapModeDescription=function(n){
	if(n==3){
	return "";
	}else{
	if(n==2){
	return "synchronous before playing";
	}else{
	return "asynchronous while playing";
	}
	}
	};*/
	/*this.menuRealTimeMix = new Item("Mixing mode", me.mixDescription(app.mixerMode) //app.mixRealTime?"asynchronous while playing":"synchronous before playing"
, function () {
	app.switchRealTimeMixing();
	//me.refresh();
	//me.menuRealTimeMix.description=app.mixRealTime?"asynchronous while playing":"synchronous before playing";
	me.menuRealTimeMix.description=me.mixDescription(app.mixerMode);
	}, function (context, x, y) {
	//var currentZoom = app.song.zoomPosition;
	if (app.mixerMode==3) {
	toolbox.drawSwitch(context, x, y, 2, 2);
	} else {
	if (app.mixerMode==2) {
	toolbox.drawSwitch(context, x, y, 1, 2);
	}else{
	toolbox.drawSwitch(context, x, y, 0, 2);
	}
	}
	});*/
	this.menuTapSize = new Item("Base cell size", "" + tapSize //app.mixRealTime?"asynchronous while playing":"synchronous before playing"
		, function () {
			app.switchTapSize();
			me.menuTapSize.description = "" + tapSize;
		}, function (context, x, y) {
			//var currentZoom = app.song.zoomPosition;
			if (app.tapSizeMode == 3) {
				toolbox.drawSwitch(context, x, y, 2, 2);
			} else {
				if (app.tapSizeMode == 2) {
					toolbox.drawSwitch(context, x, y, 1, 2);
				} else {
					toolbox.drawSwitch(context, x, y, 0, 2);
				}
			}
		});
	this.menuFullScreen = new Item("Fullscreen", "", function () {
			switchFullScreen();
		}, function (context, x, y) {
			//var currentZoom = app.song.zoomPosition;
			if (fullScreen) {
				toolbox.drawSwitch(context, x, y, 1, 1);
			} else {
				toolbox.drawSwitch(context, x, y, 0, 1);
			}
		});
	var ticker = null;
	var logCounter = 0;

	this.menuSaveState = new Item("Save state", app.song.lastSaved, function () {
			app.blur();
			me.refresh();
			//countMix=3;
			//me.partMix();
			/*if(app.play16on){
			app.stopBuffer();
			}else{
			app.playBuffer(app.song);
			}*/
			/*
			if (ticker == null) {
			console.log("start ticker");
			ticker = new Ticker(10, function () {
			var cnt = 9 * Math.random();
			console.log("tick", new Date(), new Date().getTime(), cnt);
			var n = 0;
			for (var i = 0; i < cnt; i++) {
			n = n + Math.random();
			}
			});
			ticker.start();
			} else {
			console.log("stop ticker");
			ticker.stop();
			ticker = null;
			}
			 */
			//app.playBuffer(app.song);

			//app.testPlay();
			//app.promptWarning("1");
			//app.promptWarning("2");
			/*

			//console.log(app.song);
			me.refresh();

			//var y=app.mixer.findFirstFilledRow(app.song);
			//var p=app.mixer.findFirstpositionInRow(app.song,y);
			app.mixer.mixReset(app.song);
			for (var i = 0; i < 4; i++) {

			arr=app.mixer.mixNext(980);
			console.log("next "+i,arr);
			}*/
			//console.log(y,p);
		});
	/*this.menuPlayTest = new Item("Play test", "", function () {
	app.promptConfirm("Are you sure?", function () {
	app.song = new Song();
	app.renderer.refreshSong();
	test();
	});
	});*/

	/*
	this.menuNewRiff = new Item(lang.createRiff(), "", function () {
	app.promptConfirm(lang.areYouSure(), function () {
	var songRiff = new SongRiff();
	app.song.riffs[app.song.riffs.length] = songRiff;
	app.renderer.menuRiffs.refresh();
	var pos = toolbox.findPosition(app.song.selectedPositionId, app.song);
	if (pos != null) {
	var pp = pos; //toolbox.findPosition(app.song.selectedPositionId, app.song)
	pp.riffIds[pp.riffIds.length] = songRiff.id;
	app.showPosition(pp);
	} else {
	var p0 = toolbox.findOrCreatePositionXY(app.song, 0, 0);
	p0.riffIds[p0.riffIds.length] = songRiff.id;
	app.song.positions[app.song.positions.length] = p0;
	app.showPosition(p0);
	}
	app.renderer.menuRiffs.selectRiff(songRiff);
	});

	});
	 */

	this.menuUploadMidi = new Item("Export .mid", "", function () {
			app.compiler.exportMidi(app.song);
		});
	this.menuUploadSong = new Item(lang.save(), "", function () {
			//app.promptWarning(lang.notYetAvailable());
			for (var i = 0; i < app.song.samples.length; i++) {
				var p = app.song.samples[i].path;
				app.song.samples[i].signed = app.cache.findSigned(p);
			}
			var str = JSON.stringify(app.song);
			for (var i = 0; i < app.song.samples.length; i++) {
				app.song.samples[i].signed = null;
			}
			//window.open("data:text/csv;charset=utf-8," + escape(str), "export.molgav");
			//console.log(app.compiler);
			app.compiler.saveFileAs(new Blob([str], {
					type : "application/javascript"
				}), "song.molgav");
			/*
			app.promptConfirm("Вы уверены?", function () {
			var binaryLoader = new BinaryLoader();
			var json = JSON.stringify(app.song);
			var compressedArray = LZW.compress(json);
			var compressedString = "" + compressedArray[0];
			for (var i = 1; i < compressedArray.length; i++) {
			compressedString = compressedString + "n" + compressedArray[i];
			}
			var data = "instance=" + app.instanceID + "&song=" + app.song.id + "&data=" + encodeURIComponent(compressedString);
			binaryLoader.post(//"lorem=ipsum&name=binny"
			data, "http://javafx.me/studio/song_upload.php" //, function () {
			try {
			var result = JSON.parse(binaryLoader.html);
			if (result.saved) {
			app.promptWarning("Выгружено");
			console.log(result.message);
			} else {
			app.promptWarning("Ошибка выгрузки");
			console.log(result.message);
			}
			} catch (e) {
			app.promptWarning("Ошибка: " + e);
			}
			app.renderer.fireRender();
			} //, function () {
			app.promptWarning("Невозможно выгрузить");
			app.renderer.fireRender();
			} //
			);
			});
			 */
		});
		
		
	this.menuItemEqualizer = new Item('Equalizer', '' //
		, function () {
			app.stopAudio5();
			if(app.song.equalizer){
				app.song.equalizer++;
			}else{
				app.song.equalizer=1;
			}
			if(app.song.equalizer>2){
				app.song.equalizer=0;
			}
			if(app.testPlayOn){
				app.disconnectFilters();
				app.connectFilters();
			}
		} //
		, function (context, x, y) {
			//console.log(context, x, y);
			toolbox.drawSwitch(context, x, y, app.song.equalizer, 2);
		} //
		);
		
		
		
		
	this.menuItemZoom = new Item(lang.zoom(), "" //
		, function () {
			if (app.renderer.panelSong.visibled) {
				if (app.song.zoom < 2) {
					app.song.zoom++;
				} else {
					app.song.zoom = 0;
				}
			} else {
				if (app.song.zoomPosition < 3) {
					app.song.zoomPosition++;
				} else {
					app.song.zoomPosition = 0;
				}
			}
			app.renderer.panelSong.adjustZoom(app.song.zoom);
		} //
		, function (context, x, y) {

			var currentZoom = app.song.zoomPosition;
			if (app.renderer.panelSong.visibled) {
				currentZoom = app.song.zoom;
				toolbox.drawSwitch(context, x, y, currentZoom, 2);
			} else {
				toolbox.drawSwitch(context, x, y, currentZoom, 3);
			}

			/*
			context.lineWidth = 1;
			context.strokeStyle = "#999999";
			context.fillStyle = "#999999";
			context.beginPath();
			context.arc(x + tapSize / 2, y + tapSize / 2, tapSize / 3, 0, Math.PI * 2);
			context.closePath();
			if (currentZoom == 3) {
			context.fill();
			} else {
			context.stroke();
			}
			context.beginPath();
			context.arc(x + tapSize / 2, y + tapSize / 2, tapSize / 4, 0, Math.PI * 2);
			context.closePath();
			if (currentZoom == 2) {
			context.fill();
			} else {
			context.stroke();
			}
			context.beginPath();
			context.arc(x + tapSize / 2, y + tapSize / 2, tapSize / 6, 0, Math.PI * 2);
			context.closePath();
			if (currentZoom == 1) {
			context.fill();
			} else {
			context.stroke();
			}
			context.beginPath();
			context.arc(x + tapSize / 2, y + tapSize / 2, tapSize / 10, 0, Math.PI * 2);
			context.closePath();
			if (currentZoom == 0) {
			context.fill();
			} else {
			context.stroke();
			}
			context.beginPath();
			context.lineWidth = 1;
			 */
		} //
		);
	/*
	this.menuItemZoomPosition = new Item("Riff zoom", "Change zoom" //, function () {
	if (app.song.zoomPosition < 3) {
	app.song.zoomPosition++;
	} else {
	app.song.zoomPosition = 0;
	}
	app.renderer.panelPosition.adjustZoom(app.song.zoom);
	} //, function (context, x, y) {
	context.lineWidth = 1;
	context.strokeStyle = "#999999";
	context.fillStyle = "#999999";
	context.beginPath();
	context.arc(x + tapSize / 2, y + tapSize / 2, tapSize / 3, 0, Math.PI * 2);
	context.closePath();
	if (app.song.zoomPosition == 3) {
	context.fill();
	} else {
	context.stroke();
	}
	context.beginPath();
	context.arc(x + tapSize / 2, y + tapSize / 2, tapSize / 4, 0, Math.PI * 2);
	context.closePath();
	if (app.song.zoomPosition == 2) {
	context.fill();
	} else {
	context.stroke();
	}
	context.beginPath();
	context.arc(x + tapSize / 2, y + tapSize / 2, tapSize / 6, 0, Math.PI * 2);
	context.closePath();
	if (app.song.zoomPosition == 1) {
	context.fill();
	} else {
	context.stroke();
	}
	context.beginPath();
	context.arc(x + tapSize / 2, y + tapSize / 2, tapSize / 10, 0, Math.PI * 2);
	context.closePath();
	if (app.song.zoomPosition == 0) {
	context.fill();
	} else {
	context.stroke();
	}
	context.beginPath();
	context.lineWidth = 1;
	} //
	);
	 */
	/*
	this.menuItemTest3 = new Item("examples", "load some test", function () {
	console.log("examples");
	// app.storeExamples.test();
	var binaryLoader = new BinaryLoader();
	binaryLoader.read("http://www.javafx.me/midi/" //, function () {
	//console.log("ok "+binaryLoader.html);
	var rows = binaryLoader.html.split("<a href=\"");
	var parts = null;
	for (var i = 1; i < rows.length; i++) {
	parts = rows[i].split("\">");
	if (parts.length > 0) {
	console.log("?" + parts[0]);
	}
	}
	} //, function () {
	console.log("ops");
	});
	});*/
	this.init = function () {
		console.log("MenuSlot.init");

		me.vertical = new Vertical();
		me.vertical.yAnchor = 1.2 * 0 * tapSize + 0.5 * tapSize;
		me.list = new List();
		//me.list.image=bgMenu;
		//console.log('me.list.image------------------------',me.list.image);
		me.vertical.content = me.list;
		me.list.x = me.vertical.x + 0.5 * tapSize;
		me.list.bgcolor = "rgba(0,16,32,0.5)";
		me.list.bgcolor2 = "rgba(0,16,32,0.99)";
		//me.list.add(me.menuItemShowSong);
		//me.list.add(me.menuItemShowPosition);
		me.list.add(me.menuItemPlay);
		me.list.add(me.menuLib);
		me.list.add(me.menuItemEqualizer);
		//me.list.add(me.menuItemTest3);
		me.list.add(me.menuItemZoom);
		//me.list.add(me.menuNewRiff);
		me.list.add(me.menuUploadSong);
		me.list.add(me.menuUploadMidi);
		me.list.add(me.menuShare);
		me.list.add(me.menuItemImport);
		me.list.add(me.menuItemOpen);
		me.list.add(me.menuItemMerge);
		me.list.add(me.menuSaveState);

		//me.list.add(me.menuItemZoomPosition);
		me.list.add(me.menuItemTempo);
		me.list.add(me.menuItemMeter);
		me.list.add(me.menuClearAll);
		//me.list.add(me.menuItemColors);

		me.list.add(me.menuFullScreen);
		//me.list.add(me.menuRealTimeMix);
		me.list.add(me.menuTapSize);
		me.list.add(me.menuHelp);
		me.list.add(me.menuFeedback);
		//me.list.add(me.menuPlayTest);

		app.renderer.layers[app.renderer.layers.length] = me.list;
		app.renderer.layers[app.renderer.layers.length] = me.vertical;
	};
	this.saveSettings = function (song) {
		song.settingsMenuSlotX = me.vertical.x;
		song.settingsMenuSlotY = me.vertical.y;
	};
	this.loadSettings = function (song) {
		console.log("MenuSlot.loadSettings");
		me.vertical.x = song.settingsMenuSlotX;
		me.vertical.y = song.settingsMenuSlotY;
		me.vertical.adjustBounds();
		me.list.x = me.vertical.x + 0.5 * tapSize;
	};
	this.refresh = function () {
		me.menuItemTempo.caption = lang.tempo() + " " + app.song.tempo + " bpm";
		me.menuItemMeter.caption = lang.meter() + " " + app.song.meter + " /16";
		//me.menuItemColors.caption = lang.color() + " " + lang.colorModeName(app.song.colorMode);
		me.menuSaveState.description = app.song.lastSaved;
	};
	return this;
}
function MidiCompiler() {
	var me = this;
	me.S16 = 10;
	me.S_8 = me.S16 * 2;
	me.S_4 = me.S16 * 4;
	me.S32 = me.S16 / 2;
	me.bendCount = 36;
	me.bendStep = 0x1fff / me.bendCount;
	me.writeMIDIHeader = function (midi) {
		midi.push(0x4d);
		midi.push(0x54);
		midi.push(0x68);
		midi.push(0x64);
	}
	me.write4BigEndian = function (midi, nn) {
		var byte0 = nn >> 24;
		var byte1 = (nn >> 16) & 0xff;
		var byte2 = (nn >> 8) & 0xff;
		var byte3 = nn & 0xff;
		midi.push(byte0);
		midi.push(byte1);
		midi.push(byte2);
		midi.push(byte3);
	}
	me.write3BigEndian = function (midi, nn) {
		var byte0 = nn >> 16;
		var byte1 = (nn >> 8) & 0xff;
		var byte2 = nn & 0xff;
		midi.push(byte0);
		midi.push(byte1);
		midi.push(byte2);
	}
	me.write2BigEndian = function (midi, nn) {
		var byte0 = nn >> 8;
		var byte1 = nn & 0xff;
		midi.push(byte0);
		midi.push(byte1);
	}
	me.bpmTo0x51 = function (bpm) {
		return Math.floor(60000000.0 / bpm);
	}
	me.midiTime = function (time) {
		var tt = time;
		if (tt < 0) {
			tt = 0;
		}
		var end = 0; // 0   1    2    3
		var b = [0, -128, -128, -128]; // -128 == 0x80
		for (var i = 0; i < 4; i++) {
			b[i] = Math.floor(b[i] | (tt & 0x7f));
			tt = tt >> 7;
			if (tt == 0) {
				end = i + 1;
				break;
			}
		}
		var r = new Array(end);
		for (var i = 0; i < end; i++) {
			r[end - i - 1] = b[i];
		}
		return r;
	}
	me.writeSongHeader = function (midi) {
		//System.out.println("writeSongHeader");
		midi.push(0x4d); //0 start header
		midi.push(0x54); //1
		midi.push(0x68); //2
		midi.push(0x64); //3
		midi.push(0x00); //4
		midi.push(0x00); //5
		midi.push(0x00); //6
		midi.push(0x06); //7 end of const
		midi.push(0x00); //8
		midi.push(0x01); //9 format 1
	}
	me.writeTrackHeader = function (midi) {
		//System.out.println("writeTrackHeader " + new Date());
		midi.push(0x4d); //14 start track header
		midi.push(0x54); //15
		midi.push(0x72); //16
		midi.push(0x6b); //17 end of track header
	}
	me.writeTrackFooter = function (midi) {
		//System.out.println("writeTrackFooter");
		midi.push(0x00); //57 end of track
		midi.push(0xff); //58
		midi.push(0x2f); //59
		midi.push(0x00); //60
	}
	me.writeProgramEvent = function (midi, timeShift, channel, program) {
		var r = me.midiTime(timeShift);
		me.append(midi, r);
		//midi.write(0x00);//22 start instrument
		midi.push(0xc0 | channel); //23
		midi.push(program); //24
		//System.out.println("program " + program);
	}
	me.writeTempoEvent = function (midi, timeShift, bpm) {
		//midi.write(0x00);//25 start tempo
		var r = me.midiTime(timeShift);
		//midi=midi.concat(r);
		//for(var ax=0;ax<r.length;ax++){midi.push(r[ax]);}
		me.append(midi, r);
		midi.push(0xff); //26
		midi.push(0x51); //27
		midi.push(0x03); //28
		var tempo = me.bpmTo0x51(bpm);
		me.write3BigEndian(midi, tempo);
		//midi.write(0x0b);//29
		//midi.write(0x71);//30
		//midi.write(0xb0);//31
		//console.log("writeTempoEvent",midi);
	}
	me.lsb = function (pitchValue) {
		var _lsb = pitchValue & 0x7F;
		return _lsb;
	}
	me.msb = function (pitchValue) {
		var _msb = pitchValue >> 7 & 0x7F;
		return _msb;
	}
	me.writeWheelEvent = function (midi, timeShift, channel, bend) {
		//System.out.println(bend);
		pitchValue = 0x2000 + bend;
		var r = me.midiTime(timeShift);
		me.append(midi, r);
		//midi.write(r, 0, r.length);
		midi.push(0xe0 | channel);
		midi.push(me.lsb(pitchValue));
		midi.push(me.msb(pitchValue));
	}
	me.writeMainVolume = function (midi, timeShift, channel) {
		//System.out.println("writeNoteOffEvent: " + pitch + ", " + timeShift);
		var r = me.midiTime(timeShift);
		//midi.write(r, 0, r.length);
		me.append(midi, r);
		midi.push(0xb0 | channel);
		midi.push(0x07);
		midi.push(0x7f);
	}
	me.writeNoteOffEvent = function (midi, timeShift, channel, pitch) {
		//System.out.println("writeNoteOffEvent: " + pitch + ", " + timeShift);
		//byte[] r = midiTime(timeShift);
		me.append(midi, me.midiTime(timeShift));
		//midi.write(r, 0, r.length);
		midi.push(0x80 | channel);
		midi.push(pitch);
		midi.push(0x00);
	}
	me.writeNoteOnEvent4 = function (midi, timeShift, channel, pitch) {
		me.writeNoteOnEvent5(midi, timeShift, channel, pitch, 0x7f);
	}
	me.writeNoteOnEvent5 = function (midi, timeShift, channel, pitch, volume) {
		//System.out.println("writeNoteOnEvent: " + pitch + ", " + timeShift);
		//byte[] r = midiTime(timeShift);
		//midi.write(r, 0, r.length);
		me.append(midi, me.midiTime(timeShift));
		midi.push(0x90 | channel);
		midi.push(pitch);
		midi.push(volume);
	}
	me.writeSetPitchWheelStepEvent = function (midi, timeShift, channel) {
		//byte b1 = 0x08;//4a->5e
		var b1 = (me.bendCount + 1);
		var b2 = 0x0;
		//byte[] r = midiTime(timeShift);
		//midi.write(r, 0, r.length);
		me.append(midi, me.midiTime(timeShift));
		midi.push(0xb0 | channel);
		midi.push(0x64);
		midi.push(0x00);
		//r = midiTime(0);
		//midi.write(r, 0, r.length);
		me.append(midi, me.midiTime(0));
		midi.push(0xb0 | channel);
		midi.push(0x65);
		midi.push(0x00);
		//
		//r = midiTime(0);
		//midi.write(r, 0, r.length);
		me.append(midi, me.midiTime(0));
		midi.push(0xb0 | channel);
		midi.push(0x06);
		midi.push(b1);
		//r = midiTime(0);
		//midi.write(r, 0, r.length);
		me.append(midi, me.midiTime(0));
		midi.push(0xb0 | channel);
		midi.push(0x26);
		midi.push(b2);
		//
		//r = midiTime(0);
		//midi.write(r, 0, r.length);
		me.append(midi, me.midiTime(0));
		midi.push(0xb0 | channel);
		//midi.write(0x61);? may be wrong
		midi.push(0x64);
		midi.push(0x70);
		//r = midiTime(0);
		//midi.write(r, 0, r.length);
		me.append(midi, me.midiTime(timeShift));
		midi.push(0xb0 | channel);
		midi.push(0x65);
		midi.push(0x70);
	}
	me.writeTrackCount = function (midi, count) {
		//System.out.println("writeTrackCount: " + count);
		me.write2BigEndian(midi, count);
	}
	me.writeTicksPerQuarter = function (midi, count) {
		me.write2BigEndian(midi, count);
	}
	me.writeTrackLength = function (midi, count) {
		me.write4BigEndian(midi, count);
	}
	me.writeDrumTrack = function (song, beat, midi) {
		me.writeTrackHeader(midi);
		//ByteArrayOutputStream trackData = new ByteArrayOutputStream();
		var trackData = new Array();
		me.writeTempoEvent(trackData, 0, song.tempo);
		//console.log("after writeTempoEvent",trackData);
		me.writeSetPitchWheelStepEvent(trackData, 0, 0);
		me.writeSetPitchWheelStepEvent(trackData, 0, 1);
		me.writeSetPitchWheelStepEvent(trackData, 0, 2);
		me.writeSetPitchWheelStepEvent(trackData, 0, 3);
		me.writeSetPitchWheelStepEvent(trackData, 0, 4);
		me.writeSetPitchWheelStepEvent(trackData, 0, 5);
		me.writeSetPitchWheelStepEvent(trackData, 0, 6);
		me.writeSetPitchWheelStepEvent(trackData, 0, 7);
		me.writeSetPitchWheelStepEvent(trackData, 0, 8);
		me.writeSetPitchWheelStepEvent(trackData, 0, 10);
		me.writeSetPitchWheelStepEvent(trackData, 0, 11);
		me.writeSetPitchWheelStepEvent(trackData, 0, 12);
		me.writeSetPitchWheelStepEvent(trackData, 0, 13);
		me.writeSetPitchWheelStepEvent(trackData, 0, 14);
		me.writeSetPitchWheelStepEvent(trackData, 0, 15);

		var timeShift = 0;
		for (var step = 0; step < beat.length; step++) {
			var one = beat[step];

			for (var i = 0; i < one.length; i++) {
				//OneBeat oneBeat = songData.beat(step, i);
				var midiNum = one[i];
				//console.log(step,midiNum,trackData);
				me.writeNoteOffEvent(trackData, timeShift, 9, midiNum);
				me.writeNoteOnEvent4(trackData, 0, 9, midiNum);
				timeShift = 0;
			}
			timeShift = timeShift + me.S16;
		}

		//writeNoteOnEvent(trackData, timeShift, 9, 75, 0);
		//writeNoteOffEvent(trackData, 0, 9, 75);
		me.writeTrackFooter(trackData);
		//byte[] trackBytes = trackData.toByteArray();
		//writeTrackLength(midi, trackBytes.length);
		me.writeTrackLength(midi, trackData.length);
		//midi.write(trackBytes, 0, trackBytes.length);
		//console.log("trackData",trackData);
		me.append(midi, trackData);
	};
	me.writeInstrumentsTrack = function (instrument, channel, flated, midi) {
		me.writeTrackHeader(midi);
		var trackByteArrayOutputStream = new Array();
		me.writeProgramEvent(trackByteArrayOutputStream, 0, channel, instrument);
		var oneTuneCache = new Array();
		var timeDeltaWithPrevious = 0;
		for (var step = 0; step < flated.beat.length; step++) {
			for (var i = 0; i < oneTuneCache.length; i++) { //delete
				var oneTuneOff = oneTuneCache[i];
				if (oneTuneOff.length == 0) {
					me.writeNoteOffEvent(trackByteArrayOutputStream, timeDeltaWithPrevious, channel, oneTuneOff.pitch);
					if (oneTuneOff.glissando != 0) { //stop bend
						me.writeWheelEvent(trackByteArrayOutputStream, 0, channel, 0x0000);
					}
					timeDeltaWithPrevious = 0;
				}
				oneTuneOff.length = oneTuneOff.length - 1;
			}
			var t = new Array();
			for (var i = 0; i < oneTuneCache.length; i++) { //cleanup
				var oneTuneOff = oneTuneCache[i];
				if (oneTuneOff.length > -1) {
					t.push(oneTuneOff);
				}
			}
			oneTuneCache = t;
			var tuneCountAtCurrentStep = flated.tune[step].length; //songData.getTuneCount(step);
			for (var i = 0; i < tuneCountAtCurrentStep; i++) { //add
				var iOneTune = flated.tune[step][i]; //songData.tune(step, i);
				//console.log(flated.tune[step]);
				if (iOneTune.midi == instrument) {
					//console.log(iOneTune);
					me.writeNoteOnEvent5(trackByteArrayOutputStream, timeDeltaWithPrevious, channel, iOneTune.pitch, 127);
					timeDeltaWithPrevious = 0;
					var forCache = {};
					forCache.pitch = iOneTune.pitch;
					forCache.length = iOneTune.length;
					forCache.glissando = iOneTune.shift;
					if (forCache.glissando != 0) { //add bend
						forCache.tStep = (0.0 - (forCache.glissando * me.bendStep) / (forCache.length + 1.0));
					}
					oneTuneCache.push(forCache);
				}
			}
			var noBend = true;
			for (var i = 0; i < oneTuneCache.length; i++) { //bend
				var oneTuneOff = oneTuneCache[i];
				if (oneTuneOff.glissando != 0) {
					noBend = false;
					oneTuneOff.tCurrent = oneTuneOff.tCurrent + oneTuneOff.tStep / 2;
					if (oneTuneOff.tCurrent > 0x1fff) {
						oneTuneOff.tCurrent = 0x1fff;
					}
					if (oneTuneOff.tCurrent < -0x1fff) {
						oneTuneOff.tCurrent = -0x1fff;
					}
					me.writeWheelEvent(trackByteArrayOutputStream, timeDeltaWithPrevious, channel, oneTuneOff.tCurrent);
					timeDeltaWithPrevious = 0;
				}
			}
			if (noBend) {
				//
			} else {
				timeDeltaWithPrevious = timeDeltaWithPrevious + me.S32;
				for (var i = 0; i < oneTuneCache.length; i++) { //bend
					var oneTuneOff = oneTuneCache[i];
					if (oneTuneOff.glissando != 0) {
						noBend = false;
						oneTuneOff.tCurrent = oneTuneOff.tCurrent + oneTuneOff.tStep / 2;
						if (oneTuneOff.tCurrent > 0x1fff) {
							oneTuneOff.tCurrent = 0x1fff;
						}
						if (oneTuneOff.tCurrent < -0x1fff) {
							oneTuneOff.tCurrent = -0x1fff;
						}
						me.writeWheelEvent(trackByteArrayOutputStream, timeDeltaWithPrevious, channel, oneTuneOff.tCurrent);
						timeDeltaWithPrevious = 0;
					}
				}
			}
			if (noBend) {
				timeDeltaWithPrevious = timeDeltaWithPrevious + me.S16;
			} else {
				timeDeltaWithPrevious = timeDeltaWithPrevious + me.S32;
			}
		}
		for (var i = 0; i < oneTuneCache.length; i++) { //delete last
			var oneTuneOff = oneTuneCache[i];
			if (oneTuneOff.length == 0) {
				me.writeNoteOffEvent(trackByteArrayOutputStream, timeDeltaWithPrevious, channel, oneTuneOff.pitch);
				if (oneTuneOff.tStep != 0) { //stop bend
					me.writeWheelEvent(trackByteArrayOutputStream, 0, channel, 0x0000);
				}
				timeDeltaWithPrevious = 0;
			} else {
				oneTuneOff.length = oneTuneOff.length - 1;
			}
		}
		me.writeTrackFooter(trackByteArrayOutputStream);
		//byte[] trackBytes = trackByteArrayOutputStream.toByteArray();
		me.writeTrackLength(midi, trackByteArrayOutputStream.length);
		//midi.write(trackBytes, 0, trackBytes.length);
		me.append(midi, trackByteArrayOutputStream);
		//console.log(midi,trackByteArrayOutputStream);
		return 0;
	}

	me.append = function (to, from) {
		for (var ax = 0; ax < from.length; ax++) {
			to.push(from[ax]);
		}
	};
	me.addMidi = function (arr, midi) {
		//console.log(midi);
		for (var i = 0; i < arr.length; i++) {
			var t = arr[i];
			if (t.midi == midi) {
				return;
			}
		}
		var o = {};
		o.midi = midi;
		var c = arr.length;
		if (c == 9) {
			c = 10;
		}
		o.channel = c;
		arr.push(o);
		//console.log(arr);
	};
	me.flate = function (song) {
		var beatChords = new Array();
		var tuneChords = new Array();
		var channelArray = new Array();
		var p = toolbox.findOrCreatePositionXY(song, 0, 0);
		var c16 = 0;
		var cust = 0;
		do {
			//console.log(c16,song.meter,p);
			for (var m = 0; m < song.meter; m++) {
				//console.log(c16,p);
				beatChords[c16] = new Array();
				tuneChords[c16] = new Array();
				for (var r = 0; r < p.riffIds.length; r++) {
					var songRiff = toolbox.findRiffById(p.riffIds[r], song);
					var chord = songRiff.beat[cust];
					if (chord != null) {
						for (var i = 0; i < chord.length; i++) {
							var songRiffBeatPoint = chord[i];
							var songSample = toolbox.findSampleById(songRiffBeatPoint.sampleId, song);
							beatChords[c16].push(songSample.midi);
							//console.log("set",c16,beatChords.length,songSample.midi);
							//me.addMixDrum(toolbox.findSampleById(songRiffBeatPoint.sampleId, me.mixSong));
						}
					}
					for (var t = 0; t < songRiff.tunes.length; t++) {
						var songRiffTune = songRiff.tunes[t];
						var chord = songRiffTune.steps[cust];
						if (chord != null) {
							for (var i = 0; i < chord.length; i++) {
								var songRiffTunePoint = chord[i];
								var songSample = toolbox.findSampleById(songRiffTune.sampleId, song);
								//this.addMixInstrument(songSample, songRiffTunePoint);
								var o = {};
								o.midi = songSample.midi;
								o.pitch = songRiffTunePoint.pitch;
								o.length = songRiffTunePoint.length;
								o.shift = songRiffTunePoint.shift;
								tuneChords[c16].push(o);
								me.addMidi(channelArray, o.midi);
							}
						}
					}
				}
				c16++;
				cust++;
			}
			cust = 0;
			p = toolbox.nextPosition(song, p.left, p.top);
		} while (p.left != 0 || p.top != 0);
		//console.log("return",c16,beatChords.length);
		var flated = {};
		flated.beat = beatChords;
		flated.tune = tuneChords;
		flated.channels = channelArray;
		return flated;
	};
	/*
	me.songUsedIntstruments = function (song) {
	return new Array();
	};*/
	me.compile = function (song) {
		console.log("compile start");
		var flated = me.flate(song);
		/*for(var i=0;i<flated.length;i++){
		console.log(i,flated[i]);
		}*/
		//console.log("flated", flated);
		var midi = new Array();
		//var uses = me.songUsedIntstruments(song);
		me.writeSongHeader(midi);
		//console.log("header",midi);
		me.writeTrackCount(midi, flated.channels.length + 1);
		//console.log("count",midi);
		me.writeTicksPerQuarter(midi, me.S_4);
		//console.log(midi);
		me.writeDrumTrack(song, flated.beat, midi);

		for (var i = 0; i < flated.channels.length; i++) {
			me.writeInstrumentsTrack(flated.channels[i].midi, flated.channels[i].channel, flated, midi);
		}

		//console.log("midi", midi);
		console.log("compile done");
		//me.writeTempoEvent(midi, 0, song.tempo);
		//console.log("after writeTempoEvent",midi);
		return midi;
	};
	me.exportMidi = function (song) {
		var midi = me.compile(song);
		var arrayBuffer = new ArrayBuffer(midi.length);
		var dataView = new DataView(arrayBuffer);
		for (var i = 0; i < midi.length; i++) {
			dataView.setUint8(i, midi[i]);
		}
		saveAs(new Blob([arrayBuffer], {
				type : "application/x-midi"
			}), "export.mid");
		//window.open("data:application/x-midi;charset=utf-8," + "test", "export.mid");
	};
	me.saveFileAs=function(blob,name){
		saveAs(blob,name);
	};
	return me;
}

/*
function ArrStream(){
var me=this;
me.array=new Array();
me.write=function(b){
me.array.push(b);
};
return me;
}
 */
/* FileSaver.js
 * A saveAs() FileSaver implementation.
 * 2015-03-04
 *
 * By Eli Grey, http://eligrey.com
 * License: X11/MIT
 *   See https://github.com/eligrey/FileSaver.js/blob/master/LICENSE.md
 */

/*global self */
/*jslint bitwise: true, indent: 4, laxbreak: true, laxcomma: true, smarttabs: true, plusplus: true */

/*! @source http://purl.eligrey.com/github/FileSaver.js/blob/master/FileSaver.js
saveAs(new Blob([arrayBuffer], {
type : "application/x-midi"
}), "export.mid");
 */

var saveAs = saveAs
	// IE 10+ (native saveAs)
	 || (typeof navigator !== "undefined" && navigator.msSaveOrOpenBlob && navigator.msSaveOrOpenBlob.bind(navigator))
	// Everyone else
	 || (function (view) {
		"use strict";
		// IE <10 is explicitly unsupported
		if (typeof navigator !== "undefined" &&
			/MSIE [1-9]\./.test(navigator.userAgent)) {
			return;
		}
		var doc = view.document // only get URL when necessary in case Blob.js hasn't overridden it yet
	,
		get_URL = function () {
			return view.URL || view.webkitURL || view;
		} //
	,
		save_link = doc.createElementNS("http://www.w3.org/1999/xhtml", "a") //
	,
		can_use_save_link = "download" in save_link //
	,
		click = function (node) {
			var event = doc.createEvent("MouseEvents");
			event.initMouseEvent(
				"click", true, false, view, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
			node.dispatchEvent(event);
		} //
	,
		webkit_req_fs = view.webkitRequestFileSystem //
	,
		req_fs = view.requestFileSystem || webkit_req_fs || view.mozRequestFileSystem //
	,
		throw_outside = function (ex) {
			(view.setImmediate || view.setTimeout)(function () {
				throw ex;
			}, 0);
		} //
	,
		force_saveable_type = "application/octet-stream" //
	,
		fs_min_size = 0
			// See https://code.google.com/p/chromium/issues/detail?id=375297#c7 and
			// https://github.com/eligrey/FileSaver.js/commit/485930a#commitcomment-8768047
			// for the reasoning behind the timeout and revocation flow
	,
		arbitrary_revoke_timeout = 500 // in ms
	,
		revoke = function (file) {
			var revoker = function () {
				if (typeof file === "string") { // file is an object URL
					get_URL().revokeObjectURL(file);
				} else { // file is a File
					file.remove();
				}
			};
			if (view.chrome) {
				revoker();
			} else {
				setTimeout(revoker, arbitrary_revoke_timeout);
			}
		} //
	,
		dispatch = function (filesaver, event_types, event) {
			event_types = [].concat(event_types);
			var i = event_types.length;
			while (i--) {
				var listener = filesaver["on" + event_types[i]];
				if (typeof listener === "function") {
					try {
						listener.call(filesaver, event || filesaver);
					} catch (ex) {
						throw_outside(ex);
					}
				}
			}
		} //
	,
		FileSaver = function (blob, name) {
			// First try a.download, then web filesystem, then object URLs
			var
			filesaver = this,
			type = blob.type,
			blob_changed = false,
			object_url,
			target_view,
			dispatch_all = function () {
				dispatch(filesaver, "writestart progress write writeend".split(" "));
			}
			// on any filesys errors revert to saving with object URLs
		,
			fs_error = function () {
				// don't create more object URLs than needed
				if (blob_changed || !object_url) {
					object_url = get_URL().createObjectURL(blob);
				}
				if (target_view) {
					target_view.location.href = object_url;
				} else {
					var new_tab = view.open(object_url, "_blank");
					if (new_tab == undefined && typeof safari !== "undefined") {
						//Apple do not allow window.open, see http://bit.ly/1kZffRI
						view.location.href = object_url
					}
				}
				filesaver.readyState = filesaver.DONE;
				dispatch_all();
				revoke(object_url);
			} //
		,
			abortable = function (func) {
				return function () {
					if (filesaver.readyState !== filesaver.DONE) {
						return func.apply(this, arguments);
					}
				};
			} //
		,
			create_if_not_found = {
				create : true,
				exclusive : false
			} //
		,
			slice;
			filesaver.readyState = filesaver.INIT;
			if (!name) {
				name = "download";
			}
			if (can_use_save_link) {
				object_url = get_URL().createObjectURL(blob);
				save_link.href = object_url;
				save_link.download = name;
				click(save_link);
				filesaver.readyState = filesaver.DONE;
				dispatch_all();
				revoke(object_url);
				return;
			}
			// prepend BOM for UTF-8 XML and text/plain types
			if (/^\s*(?:text\/(?:plain|xml)|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(blob.type)) {
				blob = new Blob(["\ufeff", blob], {
						type : blob.type
					});
			}
			// Object and web filesystem URLs have a problem saving in Google Chrome when
			// viewed in a tab, so I force save with application/octet-stream
			// http://code.google.com/p/chromium/issues/detail?id=91158
			// Update: Google errantly closed 91158, I submitted it again:
			// https://code.google.com/p/chromium/issues/detail?id=389642
			if (view.chrome && type && type !== force_saveable_type) {
				slice = blob.slice || blob.webkitSlice;
				blob = slice.call(blob, 0, blob.size, force_saveable_type);
				blob_changed = true;
			}
			// Since I can't be sure that the guessed media type will trigger a download
			// in WebKit, I append .download to the filename.
			// https://bugs.webkit.org/show_bug.cgi?id=65440
			if (webkit_req_fs && name !== "download") {
				name = name + ".download";
			}
			if (type === force_saveable_type || webkit_req_fs) {
				target_view = view;
			}
			if (!req_fs) {
				fs_error();
				return;
			}
			fs_min_size += blob.size;
			req_fs(view.TEMPORARY, fs_min_size, abortable(function (fs) {
					fs.root.getDirectory("saved", create_if_not_found, abortable(function (dir) {
							var save = function () {
								dir.getFile(name, create_if_not_found, abortable(function (file) {
										file.createWriter(abortable(function (writer) {
												writer.onwriteend = function (event) {
													target_view.location.href = file.toURL();
													filesaver.readyState = filesaver.DONE;
													dispatch(filesaver, "writeend", event);
													revoke(file);
												};
												writer.onerror = function () {
													var error = writer.error;
													if (error.code !== error.ABORT_ERR) {
														fs_error();
													}
												};
												"writestart progress write abort".split(" ").forEach(function (event) {
													writer["on" + event] = filesaver["on" + event];
												});
												writer.write(blob);
												filesaver.abort = function () {
													writer.abort();
													filesaver.readyState = filesaver.DONE;
												};
												filesaver.readyState = filesaver.WRITING;
											}), fs_error);
									}), fs_error);
							};
							dir.getFile(name, {
								create : false
							}, abortable(function (file) {
									// delete file if it already exists
									file.remove();
									save();
								}), abortable(function (ex) {
									if (ex.code === ex.NOT_FOUND_ERR) {
										save();
									} else {
										fs_error();
									}
								}));
						}), fs_error);
				}), fs_error);
		} //
	,
		FS_proto = FileSaver.prototype //
	,
		saveAs = function (blob, name) {
			return new FileSaver(blob, name);
		};
		FS_proto.abort = function () {
			var filesaver = this;
			filesaver.readyState = filesaver.DONE;
			dispatch(filesaver, "abort");
		};
		FS_proto.readyState = FS_proto.INIT = 0;
		FS_proto.WRITING = 1;
		FS_proto.DONE = 2;

		FS_proto.error =
			FS_proto.onwritestart =
			FS_proto.onprogress =
			FS_proto.onwrite =
			FS_proto.onabort =
			FS_proto.onerror =
			FS_proto.onwriteend =
			null;

		return saveAs;
	}
		(
			typeof self !== "undefined" && self
			 || typeof window !== "undefined" && window
			 || this.content) //
	);
// `self` is undefined in Firefox for Android content script context
// while `this` is nsIContentFrameMessageManager
// with an attribute `content` that corresponds to the window

if (typeof module !== "undefined" && module.exports) {
	module.exports.saveAs = saveAs;
} else {
	if ((typeof define !== "undefined" && define !== null) && (define.amd != null)) {
		define([], function () {
			return saveAs;
		});
	}
}
function MIDINote() {
	this.pitch = 0;
	this.instrument = 0;
	this.length = 1;
	this.glissando = 0;
	return this;
}
function MidiParser(arrayBuffer) {
	var me = this;
	// this.arrayBuffer=arrayBuffer;
	this.dataView = new DataView(arrayBuffer);
	this.counter = 0;
	this.programValues = [];
	this.programSteps = [];
	this.programChannels = [];
	this.notePitches = [];
	this.noteChannels = [];
	this.noteSteps = [];
	this.bendSizeA = [];
	this.bendSizeB = [];
	this.currentBend = [];
	this.maxLastStep = 0;
	this.lastStep = 0;
	this.limitImport = 3999;
	this.currentEventChannel = 0;
	this.songBeatSteps = [];
	this.songTuneSteps = [];
	//this.beatRiffs=[];
	this.parsedSong = null;
	var eventCount = 0;
	var eventCountStop = 150;

	this.predefinedDrums = [];
	this.predefinedDrums[35] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/001_035-035_60_-3500.0_8-16861_44100";
	this.predefinedDrums[36] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/002_036-036_60_-3600.0_8-6995_44100";
	this.predefinedDrums[37] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/003_037-037_60_-3700.0_8-3119_44100";
	this.predefinedDrums[38] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/004_038-038_60_-3800.0_8-17828_44100";
	this.predefinedDrums[39] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/005_039-039_60_-3900.0_8-25353_44100";
	this.predefinedDrums[40] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/006_040-040_60_-4000.0_8-14339_44100";
	this.predefinedDrums[41] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/007_041-041_60_-4100.0_8-48590_44100";
	this.predefinedDrums[42] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/059_042-042_60_-4200.0_8-6826_32000";
	this.predefinedDrums[43] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/008_043-043_60_-4300.0_8-48513_44100";
	this.predefinedDrums[44] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/060_044-044_60_-4400.0_8-2902_32000";
	this.predefinedDrums[45] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/010_045-045_60_-4500.0_8-50870_44100";
	this.predefinedDrums[46] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/061_046-046_60_-4600.0_8-34789_32000";
	this.predefinedDrums[47] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/011_047-047_60_-4700.0_8-48791_44100";
	this.predefinedDrums[48] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/012_048-048_60_-4800.0_8-37915_44100";
	this.predefinedDrums[49] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/014_049-049_60_-4900.0_8-120623_44100";
	this.predefinedDrums[50] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/013_050-050_60_-5000.0_8-30531_44100";
	this.predefinedDrums[51] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/015_051-051_60_-5100.0_8-93910_44100";
	this.predefinedDrums[52] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/016_052-052_60_-5200.0_8-77493_44100";
	this.predefinedDrums[53] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/017_053-053_60_-5300.0_8-99849_44100";
	this.predefinedDrums[54] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/019_054-054_60_-5400.0_8-8179_44100";
	this.predefinedDrums[55] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/020_055-055_60_-5500.0_8-57261_44100";
	this.predefinedDrums[56] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/021_056-056_60_-5600.0_8-2866_44100";
	this.predefinedDrums[57] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/022_057-057_60_-5700.0_8-109440_44100";
	this.predefinedDrums[58] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/023_058-058_60_-5800.0_8-66841_44100";
	this.predefinedDrums[59] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/024_059-059_60_-5900.0_8-90666_44100";
	this.predefinedDrums[60] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/025_060-060_60_-6000.0_8-3020_44100";
	this.predefinedDrums[61] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/026_061-061_60_-6100.0_8-4917_44100";
	this.predefinedDrums[62] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/027_062-062_60_-6200.0_8-7274_44100";
	this.predefinedDrums[63] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/028_063-063_60_-6300.0_8-6940_44100";
	this.predefinedDrums[64] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/030_064-064_60_-6400.0_8-25349_44100";
	this.predefinedDrums[65] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/031_065-065_60_-6500.0_8-21672_44100";
	this.predefinedDrums[66] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/032_066-066_60_-6600.0_8-30857_44100";
	this.predefinedDrums[67] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/033_067-067_60_-6700.0_8-4512_44100";
	this.predefinedDrums[68] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/034_068-068_60_-6800.0_8-5408_44100";
	this.predefinedDrums[69] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/035_069-069_60_-6900.0_8-7852_44100";
	this.predefinedDrums[70] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/036_070-070_60_-7000.0_8-1849_44100";
	this.predefinedDrums[71] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/037_071-071_60_-7100.0_8-3692_44100";
	this.predefinedDrums[72] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/038_072-072_60_-7200.0_8-15619_44100";
	this.predefinedDrums[73] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/039_073-073_60_-7300.0_8-2056_44100";
	this.predefinedDrums[74] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/041_074-074_60_-7400.0_8-13008_44100";
	this.predefinedDrums[75] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/058_075-075_60_-7500.0_8-2504_44100";
	this.predefinedDrums[76] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/042_076-076_60_-7600.0_8-4570_44100";
	this.predefinedDrums[77] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/043_077-077_60_-7700.0_8-4798_44100";
	this.predefinedDrums[78] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/044_078-078_60_-7800.0_8-9155_44100";
	this.predefinedDrums[79] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/045_079-079_60_-7900.0_8-12519_44100";
	this.predefinedDrums[80] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/046_080-080_60_-8000.0_8-7291_44100";
	this.predefinedDrums[81] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/047_081-081_60_-8100.0_8-55282_44100";
	this.predefinedDrums[81] = "http://molgav.nn.ru/sf/drums/000/Chaos_128/047_081-081_60_-8100.0_8-55282_44100";

	this.predefinedInstruments = [];
	this.predefinedInstruments[0] = "http://molgav.nn.ru/sf/instruments/000/Chaos_000/003_048-052_60_-5000_8-32231_22050";
	this.predefinedInstruments[1] = "http://molgav.nn.ru/sf/instruments/001/Chaos_000/004_053-057_60_-5500_8-57105_44100";
	this.predefinedInstruments[2] = "http://molgav.nn.ru/sf/instruments/002/Chaos_000/042_047-050_60_-6100_498-656_44100";
	this.predefinedInstruments[3] = "http://molgav.nn.ru/sf/instruments/003/Chaos_000/003_048-052_60_-5000_8-32231_22050";
	this.predefinedInstruments[4] = "http://molgav.nn.ru/sf/instruments/004/Chaos_000/000_000-064_60_-7000_1143-1238_44100";
	this.predefinedInstruments[5] = "http://molgav.nn.ru/sf/instruments/005/Chaos_000/000_000-066_60_-6800_2183-2288_44100";
	this.predefinedInstruments[6] = "http://molgav.nn.ru/sf/instruments/006/Chaos_000/001_048-055_60_-6400_508-645_44100";
	this.predefinedInstruments[7] = "http://molgav.nn.ru/sf/instruments/007/Chaos_000/002_049-055_60_-6000_824-991_44100";
	this.predefinedInstruments[8] = "http://molgav.nn.ru/sf/instruments/008/Chaos_000/000_000-096_60_-9100_4273-4440_44100";
	this.predefinedInstruments[9] = "http://molgav.nn.ru/sf/instruments/009/Chaos_000/000_000-098_60_-9400_5624-6074_44100";
	this.predefinedInstruments[10] = "http://molgav.nn.ru/sf/instruments/010/Chaos_000/000_000-096_60_-8900_2774-3053_44100";
	this.predefinedInstruments[11] = "http://molgav.nn.ru/sf/instruments/011/Chaos_000/000_000-069_60_-7500_860-929_44100";
	this.predefinedInstruments[12] = "http://molgav.nn.ru/sf/instruments/012/Chaos_000/000_000-054_60_-5800_1252-1437_44100";
	this.predefinedInstruments[13] = "http://molgav.nn.ru/sf/instruments/013/Chaos_000/000_000-098_60_-7900_889-944_44100";
	this.predefinedInstruments[14] = "http://molgav.nn.ru/sf/instruments/014/Chaos_000/000_000-108_60_-8600_4818-5471_44100";
	this.predefinedInstruments[15] = "http://molgav.nn.ru/sf/instruments/015/Chaos_000/000_000-088_60_-7900_3194-3250_44100";
	this.predefinedInstruments[16] = "http://molgav.nn.ru/sf/instruments/016/Chaos_000/000_000-054_60_-6800_50-262_44100";
	this.predefinedInstruments[17] = "http://molgav.nn.ru/sf/instruments/017/Chaos_000/000_000-080_60_-7800_1350-1472_44100";
	this.predefinedInstruments[18] = "http://molgav.nn.ru/sf/instruments/018/Chaos_000/002_044-055_60_-6700_8-41545_22050";
	this.predefinedInstruments[19] = "http://molgav.nn.ru/sf/instruments/019/Fluid_000/000_000-036_36_-3600_24522-61248_22050";
	this.predefinedInstruments[20] = "http://molgav.nn.ru/sf/instruments/020/Chaos_000/001_053-070_60_-7800_727-787_44100";
	this.predefinedInstruments[21] = "http://molgav.nn.ru/sf/instruments/021/Chaos_000/001_053-070_60_-7800_727-787_44100";
	this.predefinedInstruments[22] = "http://molgav.nn.ru/sf/instruments/022/Chaos_000/002_060-064_60_-7400_1023-1097_44100";
	this.predefinedInstruments[23] = "http://molgav.nn.ru/sf/instruments/023/Chaos_000/001_053-070_60_-7800_727-787_44100";
	this.predefinedInstruments[24] = "http://molgav.nn.ru/sf/instruments/024/Chaos_000/004_063-065_60_-7400_2109-2184_44100";
	this.predefinedInstruments[25] = "http://molgav.nn.ru/sf/instruments/025/Chaos_000/002_055-063_60_-5900_8-71799_22050";
	this.predefinedInstruments[26] = "http://molgav.nn.ru/sf/instruments/026/Chaos_000/001_045-049_60_-5600_5451-5664_44100";
	this.predefinedInstruments[27] = "http://molgav.nn.ru/sf/instruments/027/Chaos_000/002_060-063_60_-7200_1554-1639_44100";
	this.predefinedInstruments[28] = "http://molgav.nn.ru/sf/instruments/028/Chaos_000/002_055-127_60_-6000_8-1508_22050";
	//this.predefinedInstruments[29] = "http://molgav.nn.ru/sf/instruments/029/Fluid_000/000_000-043_60_-4000_245954-247023_22050";
	this.predefinedInstruments[29] = "http://molgav.nn.ru/sf/instruments/030/Kamac_000/005_050-051_60_-5000_15291-16040_22050";

	//this.predefinedInstruments[30] = "http://molgav.nn.ru/sf/instruments/030/Fluid_000/000_000-043_60_-4000_334593-336777_30000";
	this.predefinedInstruments[30] = "http://molgav.nn.ru/sf/instruments/030/Kamac_000/001_040-042_60_-4000_17910-18177_22050";

	this.predefinedInstruments[31] = "http://molgav.nn.ru/sf/instruments/031/Chaos_000/000_068-127_60_-6800_1085-1350_44100";
	this.predefinedInstruments[32] = "http://molgav.nn.ru/sf/instruments/032/Fluid_000/000_000-028_60_-2800_76560-78701_44100";
	this.predefinedInstruments[33] = "http://molgav.nn.ru/sf/instruments/033/SynthGMS_000/000_000-084_60_-6200_750-900_44100";
	this.predefinedInstruments[34] = "http://molgav.nn.ru/sf/instruments/034/Chaos_000/002_044-052_60_-4500_8655-9466_44100";
	this.predefinedInstruments[35] = "http://molgav.nn.ru/sf/instruments/035/Chaos_000/001_050-127_60_-5600_17100-17523_44100";
	this.predefinedInstruments[36] = "http://molgav.nn.ru/sf/instruments/036/Chaos_000/001_038-127_60_-4300_8-25976_44100";
	this.predefinedInstruments[37] = "http://molgav.nn.ru/sf/instruments/037/Chaos_000/001_038-127_60_-4300_8-25976_44100";
	this.predefinedInstruments[38] = "http://molgav.nn.ru/sf/instruments/038/Chaos_000/004_060-065_60_-6400_1995-2129_44100";
	this.predefinedInstruments[39] = "http://molgav.nn.ru/sf/instruments/039/Chaos_000/003_057-127_60_-5000_8-6721_22050";
	this.predefinedInstruments[40] = "http://molgav.nn.ru/sf/instruments/040/Chaos_000/001_061-066_60_-7400_1510-1585_44100";
	this.predefinedInstruments[41] = "http://molgav.nn.ru/sf/instruments/041/Chaos_000/001_059-065_60_-7400_1510-1585_44100";
	this.predefinedInstruments[42] = "http://molgav.nn.ru/sf/instruments/042/Chaos_000/000_061-073_60_-5800_1325-1514_44100";
	this.predefinedInstruments[43] = "http://molgav.nn.ru/sf/instruments/043/Chaos_000/000_060-073_60_-5400_5223-5461_44100";
	this.predefinedInstruments[44] = "http://molgav.nn.ru/sf/instruments/044/Chaos_000/002_058-063_60_-7000_5314-24115_44100";
	this.predefinedInstruments[45] = "http://molgav.nn.ru/sf/instruments/045/Chaos_000/000_000-068_60_-7500_3506-3577_44100";
	this.predefinedInstruments[46] = "http://molgav.nn.ru/sf/instruments/046/Chaos_000/001_049-051_60_-7700_529-592_44100";
	this.predefinedInstruments[47] = "http://molgav.nn.ru/sf/instruments/047/Chaos_000/001_045-127_60_-4800_8-26756_22050";
	this.predefinedInstruments[48] = "http://molgav.nn.ru/sf/instruments/048/Chaos_000/002_058-063_60_-7000_5314-24115_44100";
	this.predefinedInstruments[49] = "http://molgav.nn.ru/sf/instruments/049/Chaos_000/001_050-057_60_-6500_12249-26224_44100";
	this.predefinedInstruments[50] = "http://molgav.nn.ru/sf/instruments/050/Chaos_000/000_000-061_60_-6700_18-11263_44100";
	this.predefinedInstruments[51] = "http://molgav.nn.ru/sf/instruments/051/Chaos_000/004_000-061_60_-6700_18-11263_44100";
	this.predefinedInstruments[52] = "http://molgav.nn.ru/sf/instruments/052/Chaos_000/001_055-066_60_-6000_8-22252_22050";
	this.predefinedInstruments[53] = "http://molgav.nn.ru/sf/instruments/053/Chaos_000/002_057-061_60_-6700_1-4470_44100";
	this.predefinedInstruments[54] = "http://molgav.nn.ru/sf/instruments/054/Chaos_000/000_000-074_60_-7600_3-9947_44100";
	this.predefinedInstruments[55] = "http://molgav.nn.ru/sf/instruments/055/Chaos_000/001_000-127_60_-8800_8-34778_44100";
	this.predefinedInstruments[56] = "http://molgav.nn.ru/sf/instruments/056/Fluid_000/000_000-066_60_-6000_7185-18296_44100";
	this.predefinedInstruments[57] = "http://molgav.nn.ru/sf/instruments/057/Chaos_000/001_055-059_60_-6800_2440-2544_44100";
	this.predefinedInstruments[58] = "http://molgav.nn.ru/sf/instruments/058/Chaos_000/002_042-046_60_-5600_18971-25008_44100";
	this.predefinedInstruments[59] = "http://molgav.nn.ru/sf/instruments/059/Chaos_000/000_000-062_60_-6800_2460-2566_44100";
	this.predefinedInstruments[60] = "http://molgav.nn.ru/sf/instruments/060/Chaos_000/000_000-067_60_-7400_3338-3414_44100";
	this.predefinedInstruments[61] = "http://molgav.nn.ru/sf/instruments/061/Chaos_000/000_000-065_60_-7100_8434-28133_44100";
	this.predefinedInstruments[62] = "http://molgav.nn.ru/sf/instruments/062/Chaos_000/000_000-068_60_-6600_19-10715_44100";
	this.predefinedInstruments[63] = "http://molgav.nn.ru/sf/instruments/063/Chaos_000/000_000-067_60_-6600_19-10715_44100";
	this.predefinedInstruments[64] = "http://molgav.nn.ru/sf/instruments/064/Chaos_000/002_063-066_60_-7200_44934-52491_44100";
	this.predefinedInstruments[65] = "http://molgav.nn.ru/sf/instruments/065/Chaos_000/000_000-055_60_-4800_8-22996_22050";
	//this.predefinedInstruments[66] = "http://molgav.nn.ru/sf/instruments/066/Chaos_000/001_049-053_60_-5300_8-10836_22050";
	this.predefinedInstruments[66] = "http://molgav.nn.ru/sf/instruments/066/Fluid_000/000_000-047_60_-4700_52484-59757_32000";
	
	
	
	this.predefinedInstruments[67] = "http://molgav.nn.ru/sf/instruments/067/Chaos_000/003_049-052_60_-6200_1222-1372_44100";
	this.predefinedInstruments[68] = "http://molgav.nn.ru/sf/instruments/068/Chaos_000/000_000-062_60_-6900_3336-3437_44100";
	this.predefinedInstruments[69] = "http://molgav.nn.ru/sf/instruments/069/Chaos_000/001_055-058_60_-6800_1026-1130_44100";
	this.predefinedInstruments[70] = "http://molgav.nn.ru/sf/instruments/070/Chaos_000/002_051-054_60_-6300_893-1034_44100";
	this.predefinedInstruments[71] = "http://molgav.nn.ru/sf/instruments/071/Chaos_000/001_050-055_60_-5700_1891-2094_44100";
	this.predefinedInstruments[72] = "http://molgav.nn.ru/sf/instruments/072/Chaos_000/000_000-088_60_-9000_782-811_44100";
	this.predefinedInstruments[73] = "http://molgav.nn.ru/sf/instruments/073/Chaos_000/000_000-070_60_-7700_1418-1480_44100";
	this.predefinedInstruments[74] = "http://molgav.nn.ru/sf/instruments/074/Chaos_000/000_000-096_60_-8000_1683-1736_44100";
	this.predefinedInstruments[75] = "http://molgav.nn.ru/sf/instruments/075/Chaos_000/000_053-076_60_-7700_1570-8382_44100";
	this.predefinedInstruments[76] = "http://molgav.nn.ru/sf/instruments/076/Chaos_000/000_000-100_60_-7700_4207-10523_44100";
	this.predefinedInstruments[77] = "http://molgav.nn.ru/sf/instruments/077/Chaos_000/000_000-108_60_-8900_3174-3206_44100";
	this.predefinedInstruments[78] = "http://molgav.nn.ru/sf/instruments/078/Chaos_000/000_000-108_60_-8800_156-190_44100";
	this.predefinedInstruments[79] = "http://molgav.nn.ru/sf/instruments/079/Chaos_000/000_000-108_60_-8800_156-190_44100";
	this.predefinedInstruments[80] = "http://molgav.nn.ru/sf/instruments/080/Chaos_000/000_000-064_60_-6900_8-14597_32000";
	this.predefinedInstruments[81] = "http://molgav.nn.ru/sf/instruments/081/Chaos_000/000_000-068_60_-6700_8-13481_32000";
	this.predefinedInstruments[82] = "http://molgav.nn.ru/sf/instruments/082/Chaos_000/001_051-062_60_-7100_16118-44026_44100";
	this.predefinedInstruments[83] = "http://molgav.nn.ru/sf/instruments/083/Chaos_000/000_000-076_60_-7700_1570-8382_44100";
	this.predefinedInstruments[84] = "http://molgav.nn.ru/sf/instruments/084/Chaos_000/004_053-057_60_-5500_8-96417_22050";
	this.predefinedInstruments[85] = "http://molgav.nn.ru/sf/instruments/085/Chaos_000/000_000-108_60_-9800_129-5427_44100";
	this.predefinedInstruments[86] = "http://molgav.nn.ru/sf/instruments/086/Chaos_000/000_000-091_60_-8400_4609-13118_44100";
	this.predefinedInstruments[87] = "http://molgav.nn.ru/sf/instruments/087/Chaos_000/002_055-065_60_-6400_1995-2129_44100";
	this.predefinedInstruments[88] = "http://molgav.nn.ru/sf/instruments/088/Chaos_000/002_000-078_60_-8400_4609-13118_44100";
	this.predefinedInstruments[89] = "http://molgav.nn.ru/sf/instruments/089/Chaos_000/000_000-084_60_-8400_4609-13118_44100";
	this.predefinedInstruments[90] = "http://molgav.nn.ru/sf/instruments/090/Chaos_000/000_000-091_60_-8400_4609-13118_44100";
	this.predefinedInstruments[91] = "http://molgav.nn.ru/sf/instruments/091/Chaos_000/000_000-108_60_-9500_26-4870_44100";
	this.predefinedInstruments[92] = "http://molgav.nn.ru/sf/instruments/092/Chaos_000/000_000-108_60_-9500_26-4870_44100";
	this.predefinedInstruments[93] = "http://molgav.nn.ru/sf/instruments/093/Chaos_000/002_060-063_60_-7200_1554-1639_44100";
	this.predefinedInstruments[94] = "http://molgav.nn.ru/sf/instruments/094/Chaos_000/000_000-090_60_-7600_3-9947_44100";
	this.predefinedInstruments[95] = "http://molgav.nn.ru/sf/instruments/095/Chaos_000/000_000-091_60_-8400_4609-13118_44100";
	this.predefinedInstruments[96] = "http://molgav.nn.ru/sf/instruments/096/Chaos_000/000_000-091_60_-8400_4609-13118_44100";
	this.predefinedInstruments[97] = "http://molgav.nn.ru/sf/instruments/097/Chaos_000/000_000-084_60_-7700_4609-13118_44100";
	this.predefinedInstruments[98] = "http://molgav.nn.ru/sf/instruments/098/Chaos_000/000_000-084_60_-9100_4273-4440_44100";
	this.predefinedInstruments[99] = "http://molgav.nn.ru/sf/instruments/099/Chaos_000/000_000-091_60_-8400_4609-13118_44100";
	this.predefinedInstruments[100] = "http://molgav.nn.ru/sf/instruments/100/Chaos_000/000_000-108_60_-9800_129-5427_44100";
	this.predefinedInstruments[101] = "http://molgav.nn.ru/sf/instruments/101/Chaos_000/000_000-090_60_-7600_3-9947_44100";
	this.predefinedInstruments[102] = "http://molgav.nn.ru/sf/instruments/102/Chaos_000/001_068-073_60_-8100_4-6974_44100";
	this.predefinedInstruments[103] = "http://molgav.nn.ru/sf/instruments/103/Chaos_000/001_048-059_60_-6400_1530-1665_44100";
	this.predefinedInstruments[104] = "http://molgav.nn.ru/sf/instruments/104/Chaos_000/000_000-084_60_-7400_1488-1562_44100";
	this.predefinedInstruments[105] = "http://molgav.nn.ru/sf/instruments/105/Chaos_000/000_000-063_60_-6900_2095-2196_44100";
	this.predefinedInstruments[106] = "http://molgav.nn.ru/sf/instruments/106/Chaos_000/001_056-060_60_-7000_1102-1197_44100";
	this.predefinedInstruments[107] = "http://molgav.nn.ru/sf/instruments/107/Chaos_000/001_062-066_60_-7300_1016-1094_44100";
	this.predefinedInstruments[108] = "http://molgav.nn.ru/sf/instruments/108/Chaos_000/000_000-084_60_-7200_2024-2192_44100";
	this.predefinedInstruments[109] = "http://molgav.nn.ru/sf/instruments/109/Chaos_000/001_058-084_60_-7900_976-1033_44100";
	this.predefinedInstruments[110] = "http://molgav.nn.ru/sf/instruments/110/Chaos_000/000_000-060_60_-7000_1205-1299_44100";
	this.predefinedInstruments[111] = "http://molgav.nn.ru/sf/instruments/111/Chaos_000/001_055-056_60_-6800_1026-1130_44100";
	this.predefinedInstruments[112] = "http://molgav.nn.ru/sf/instruments/112/Chaos_000/000_000-127_60_-10700_3438-4116_44100";
	this.predefinedInstruments[113] = "http://molgav.nn.ru/sf/instruments/113/Chaos_000/000_000-108_60_-8400_2123-2289_44100";
	this.predefinedInstruments[114] = "http://molgav.nn.ru/sf/instruments/114/Chaos_000/000_000-089_60_-7600_4661-4791_44100";
	this.predefinedInstruments[115] = "http://molgav.nn.ru/sf/instruments/115/Chaos_000/000_000-127_60_-9200_3-844_44100";
	this.predefinedInstruments[116] = "http://molgav.nn.ru/sf/instruments/116/Chaos_000/000_000-108_60_-8200_1799-3399_44100";
	this.predefinedInstruments[117] = "http://molgav.nn.ru/sf/instruments/117/Chaos_000/000_000-127_60_-6000_8-25332_44100";
	this.predefinedInstruments[118] = "http://molgav.nn.ru/sf/instruments/118/Chaos_000/000_000-108_60_-10300_1230-1313_44100";
	this.predefinedInstruments[119] = "http://molgav.nn.ru/sf/instruments/119/Chaos_000/000_000-127_60_-6000_3807-12024_44100";
	this.predefinedInstruments[120] = "http://molgav.nn.ru/sf/instruments/120/Chaos_000/000_000-108_60_-7500_3-3409_44100";
	this.predefinedInstruments[121] = "http://molgav.nn.ru/sf/instruments/121/Chaos_000/000_000-076_60_-7700_1570-8382_44100";
	this.predefinedInstruments[122] = "http://molgav.nn.ru/sf/instruments/122/Chaos_000/000_000-108_60_-8300_6-14020_44100";
	this.predefinedInstruments[123] = "http://molgav.nn.ru/sf/instruments/123/Chaos_000/000_000-127_60_-6000_8-62283_44100";
	this.predefinedInstruments[124] = "http://molgav.nn.ru/sf/instruments/124/Chaos_000/000_000-127_68_-6755_32-1537_22050";
	this.predefinedInstruments[125] = "http://molgav.nn.ru/sf/instruments/125/Chaos_000/000_000-108_60_-8800_3-4157_44100";
	this.predefinedInstruments[126] = "http://molgav.nn.ru/sf/instruments/126/Chaos_000/000_000-127_60_-8500_9-8682_44100";
	this.predefinedInstruments[127] = "http://molgav.nn.ru/sf/instruments/127/Chaos_000/000_000-108_60_-8200_3-10413_44100";

	this.parse = function (padStart, riffSize, tmp) {

		console.log("MidiParser.parse", padStart, riffSize);
		me.counter = 8;
		var fileFormat = me.read2BigEndian();
		console.log("fileFormat: " + fileFormat);
		var trackCount = me.read2BigEndian();
		console.log("trackCount: " + trackCount);
		me.ticksPerQuarter = me.read2BigEndian();
		console.log("ticksPerQuarter: " + me.ticksPerQuarter);
		me.tempo = 60000000.0 / (960.0 * me.ticksPerQuarter);
		console.log("tempo: " + me.tempo);
		me.programValues = [];
		me.programSteps = [];
		me.programChannels = [];
		me.notePitches = [];
		me.noteChannels = [];
		me.noteSteps = [];
		me.bendSizeA = [];
		me.bendSizeB = [];
		me.currentBend = [];
		var i = 0;
		me.songTuneSteps = [];
		me.songBeatSteps = [];
		for (i = 0; i < 16; i++) {
			me.bendSizeA[i] = 0;
			me.bendSizeB[i] = 0;
			me.currentBend[i] = 0;
		}
		me.maxLastStep = 0;
		for (i = 0; i < trackCount; i++) {
			me.parseTrack();
		}
		console.log("maxLastStep " + me.maxLastStep);
		// maxLastStep = limitImport;
		// songData.noteCount = maxLastStep;
		//me.dumpSong();

		me.extractRiffs(padStart, riffSize);

		me.parsedSong.zoom = app.song.zoom;
		me.parsedSong.zoomPosition = app.song.zoomPosition;
		me.parsedSong.meter = app.song.meter;
		me.parsedSong.tempo = app.song.tempo;
		//upDrums(me.parsedSong);
		app.song = me.parsedSong;
		app.renderer.refreshSong();
		console.log(app.song);
	};
	/*this.upDrums=function(){
	};*/
	this.getBlock8 = function (n8) {
		var block = [];
		for (var i = n8; i < n8 + 8 && i < me.songTuneSteps.length; i++) {
			block.push(me.songTuneSteps[i]);
		}
		for (var i = block.length; i < 8; i++) {
			block.push([]);
		}
		return block;
	};
	this.existsMidiNote = function (one, all) {
		for (var i = 0; i < all.length; i++) {
			var cu = all[i];
			if (cu.pitch == one.pitch &&
				cu.instrument == one.instrument) {
				return true;
			}
		}
		return false;
	};
	this.block8equals = function (b1, b2) {
		var countNotes = 0;
		var countOverlap = 0;
		for (var i = 0; i < 8; i++) {
			s1 = b1[i];
			s2 = b2[i];
			var instruments = [];
			//for(var i=0;i<
			for (var n1 = 0; n1 < s1.length; n1++) {
				var midiNote1 = s1[n1];
				countNotes++;
				if (this.existsMidiNote(midiNote1, s2)) {
					countOverlap++;
				}
			}
			for (var n2 = 0; n2 < s2.length; n2++) {
				var midiNote2 = s2[n2];
				countNotes++;
				if (this.existsMidiNote(midiNote2, s1)) {
					countOverlap++;
				}
			}
		}
		var ratio = 1;
		if (countNotes > 0) {
			ratio = countOverlap / countNotes;
		}
		//console.log(ratio,countOverlap,countNotes);
		if (ratio > 0.5) {
			return true;
		} else {
			return false;
		}
	}

	this.block8equalsTo = function (block8, to) {}

	this.findBlockIndex = function (b8, blocks) {
		if (!this.empty8(b8)) {
			for (var i = 0; i < blocks.length; i++) {
				if (me.block8equals(b8, blocks[i])) {
					return i;
				}
			}
		}
		blocks.push(b8);
		return blocks.length - 1;
	};
	this.empty8 = function (b8) {
		for (var i = 0; i < b8.length; i++) {
			if (b8[i].length > 0) {
				return false;
			}
		}
		return true;
	};
	this.split8 = function () {
		console.log("steps---------------");
		//console.log(me.songTuneSteps.length);
		var blocks = [];
		var indexes = [];
		for (var i = 0; i < me.songTuneSteps.length / 8; i++) {
			var b8 = me.getBlock8(i * 8);
			var idx = me.findBlockIndex(b8, blocks);
			indexes.push(idx);
			//if(i<5)console.log(b8);
			//console.log("/" + idx);
		}
		//console.log(indexes,blocks.length, indexes.length, me.songTuneSteps.length);

		var str = "";
		for (var i = 0; i < indexes.length; i++) {
			str = str + "," + indexes[i];
		}
		console.log('blocks', str);
		var pa = new PatternArray(indexes);
		//console.log('longest', pa.longest.pattern, '		', pa.longest.positions);
		/*var b1=me.getBlock8(32+8*0);
		var b2=me.getBlock8(32+8*1);
		var b3=me.getBlock8(32+8*2);
		var b4=me.getBlock8(32+8*3);
		var b5=me.getBlock8(32+8*4);
		me.block8equals(b1,b2);*/
		console.log('-----------');
		return pa;
	};

	//----------9999999999999999999999999999999999999999999999999
	function existstInDictionary(name, dictionary) {
		for (var i = 0; i < dictionary.length; i++) {
			if (dictionary[i].name == name) {
				return true;
			}
		}
		return false;
	}
	function addToDictionary(it, dictionary, textArray) {

		var pos = [];
		for (var i = 0; i < textArray.length; i++) {
			if (textArray[i] == it) {
				pos.push(i);
			}
		}
		dictionary.push({
			name : it,
			positions : pos
		});
		/*if(pos.length>1){
		var pr=[];
		for(var p1=0;p1<pos.length-1;p1++){
		for(var p2=p1+1;p2<pos.length && pos[p2]+(pos[p2]-pos[p1])<textArray.length;p2++){
		pr.push({
		first:pos[p1],second:pos[p2]
		});
		}
		}
		if(pr.length>0){
		//console.log('before',pr);
		pr.sort(function(a,b){
		var aLen=1000*(a.second-a.first)-a.first;
		var bLen=1000*(b.second-b.first)-b.first;
		var d=bLen-aLen;
		//console.log('d',d);
		return d;
		});
		//console.log('after',pr);
		dictionary.push({
		name:it,positions:pos,pairs:pr
		});
		}
		}*/
	}

	function createDictionary(textArr) {
		var di = [];
		for (var i = 0; i < textArr.length; i++) {
			if (!existstInDictionary(textArr[i], di)) {
				addToDictionary(textArr[i], di, textArr);
			}
		}
		return di;
	}
	function findPosition(from, num, positions) {
		//console.log('findPosition',from,num);
		for (var i = from; i < positions.length; i++) {
			if (positions[i] == num) {
				return i;
			}
		}
		return -1;
	}
	function addAFoursome(len, it, positions, f) {
		//console.log('addAFoursome',len,name,positions,f);
		for (var i = 0; i < positions.length - 3; i++) {
			//console.log('i',i);
			//var p1=positions[i];
			//console.log('p1',p1);
			var p2 = findPosition(i + 1, positions[i] + 1 * len, positions);
			//console.log('p2',p2);
			if (p2 > -1) {
				var p3 = findPosition(i + 2, positions[i] + 2 * len, positions);
				//console.log('p3',p3);
				if (p3 > -1) {
					var p4 = findPosition(i + 3, positions[i] + 3 * len, positions);
					//console.log('p4',p4);
					if (p4 > -1) {
						//if(it==0){console.log('push',it,'from',positions[i],'size',len);}
						f.push({
							name : it,
							start : positions[i],
							interval : len
						});
						//console.log('addAFoursome',f);
					}
				}
			}
		}
	}
	function addFoursomes(mx, name, positions, f) {

		for (var n = 1; n < mx; n++) {
			addAFoursome(n, name, positions, f);
		}
	}
	function createFoursomes(dictionary) {
		var f = [];
		for (var i = 0; i < dictionary.length; i++) {
			//console.log(i,dictionary[i]);
			var mx = Math.ceil(dictionary[i].positions[dictionary[i].positions.length - 1] - dictionary[i].positions[0]);
			addFoursomes(mx, dictionary[i].name, dictionary[i].positions, f);
		}
		/*f.sort(function(f1,f2){
		return (1000*f1.start-f1.interval)-(1000*f2.start-f2.interval);
		});
		var l=f.splice();
		l.sort(function(f1,f2){
		return (1000*f1.start-f1.interval)-(1000*f2.start-f2.interval);
		});
		console.log(f);*/
		return f;
	}
	function findFoursome(start, name, interval, foursomes) {
		for (var s = 0; s < foursomes.length; s++) {
			if (foursomes[s].name == name && foursomes[s].start == start && foursomes[s].interval == interval) {
				//console.log(i,foursomes[s].name,foursomes[s].interval);
				return foursomes[s];
			}
		}
		return null;
	}
	function findNextFoursome(start, name, skipInterval, foursomes) {
		for (var s = 0; s < foursomes.length; s++) {
			if (foursomes[s].name == name && foursomes[s].start == start && foursomes[s].interval < skipInterval) {
				return foursomes[s];
			}
		}
		return null;
	}
	function findFirstFoursome(start, name, foursomes) {
		for (var s = 0; s < foursomes.length; s++) {
			if (foursomes[s].name == name && foursomes[s].start == start) {
				return foursomes[s];
			}
		}
		return null;
	}
	function fillSplits2(foursomes, textArray) {
		var splits = [];
		for (var i = 0; i < textArray.length; i++) {
			var cu = findFirstFoursome(i, textArray[i], foursomes);
			while (cu != null) {
				var txt = '';
				var overlapCounter = 0;
				for (var n = 0; n < cu.interval - 1; n++) {
					var nx = findFoursome(i + n + 1, textArray[i + n + 1], cu.interval, foursomes);
					if (nx != null) {
						txt = '' + txt + '' + textArray[i + n + 1];
						overlapCounter++;
					} else {
						txt = txt + '*';
					}
				}
				var ratio = overlapCounter / (cu.interval - 1);
				if (ratio > 0.75) {
					console.log('ratio', ratio, 'riff', textArray[i], 'txt', txt, cu);
					if (i > 0) {
						splits.push(i * 8);
					}
					i = i + cu.interval * 4 - 1;
					break;
				} else {
					cu = findNextFoursome(i, textArray[i], cu.interval, foursomes);
				}
			}
		}
		return splits;
	}
	function fillSplits(foursomes, textArray) {
		console.log('textArray', textArray);
		var splits = [];
		//var riffs=[];
		foursomes.sort(function (f1, f2) {
			return (1000 * f2.interval - f2.start) - (1000 * f1.interval - f1.start);
			//return (1000*f1.start-f1.interval)-(1000*f2.start-f2.interval);
		});
		console.log('foursomes', foursomes);
		//var mx=0;
		if (foursomes.length > 0) {
			//mx=foursomes[0].interval;
			var current = foursomes[i];
			var counter = 0;
			for (var i = 1; i < foursomes.length; i++) {
				console.log('current', current);
				for (var n = 0; n < foursomes.length; n++) {
					//if(
					console.log(n, 'next', current.star);
				}
				//if(foursomes[i].interval<mx){
				//splits.push(8*(foursomes[i].start));
				//splits.push(8*(foursomes[i].start+foursomes[i].interval*4));
				//console.log(foursomes[i]);
				//}
				break;
			}
		}
		//console.log('riffs',riffs);
		console.log('splits', splits);
		return splits;
	}
	//----------9999999999999999999999999999999999999999999999999
	function splitByDictionary(dictionary, indexes) {
		console.log('splitByDictionary', dictionary);
		console.log('indexes', indexes);
		/*dictionary.sort(function(f1,f2){
		return
		return (f1.pairs[0].second-f1.pairs[0].first)-(f2.pairs[0].second-f2.pairs[0].first);
		//return (1000*f1.start-f1.interval)-(1000*f2.start-f2.interval);
		});
		console.log('splitByDictionary 2',dictionary);*/
		/*var pairs=[];
		for(var i=0;i<dictionary.length;i++){
		//console.log(i,' ',dictionary[i]);
		for(var p=0;p<dictionary[i].pairs.length;p++){
		//if(dictionary[i].pairs[p].second-dictionary[i].pairs[p].first>1){
		pairs.push({
		name:dictionary[i].name
	,pair:dictionary[i].pairs[p]
		}
		);
		//}
		}
		}
		pairs.sort(function(f1,f2){
		return (f2.pair.second-f2.pair.first)-(f1.pair.second-f1.pair.first);
		});
		console.log('pairs',pairs);
		if(pairs.length>0){
		var counter=0;
		for(var i=0;i<pairs.length-1 && counter<400;i++){
		var pair=pairs[i];
		var len=pair.pair.second-pair.pair.first;
		//console.log(i,'current',pair.name,len,pair);
		//var exists=false;
		for(var n=1;n<len;n++){
		//console.log('seek',n);
		for(var k=0;k<pairs.length;k++){
		if(pairs[k].first==pair.pair.first+n && pairs[k].second-pairs[k].first==pair.pair.second-pair.pair.first){
		console.log('found',pairs[k],'for',pair);
		break;
		}
		}
		}
		//if(ok){
		//console.log(i,pair);
		counter++;
		//}
		}

		}*/
		var splits = [];
		var intervals = [];
		for (var i = 0; i < dictionary.length; i++) {
			var pos = dictionary[i].positions;
			for (var p1 = 0; p1 < pos.length - 1; p1++) {
				for (var p2 = p1 + 1; p2 < pos.length; p2++) {
					var sz = pos[p2] - pos[p1];
					if (sz > 3 && sz < 50) {
						intervals.push({
							name : dictionary[i].name,
							start : pos[p1],
							size : sz
						});
					}
				}
			}
		}
		intervals.sort(function (f1, f2) {
			return (f2.size * 1000 - f2.start) - (f1.size * 1000 - f1.start);
		});
		var occupied = [];
		//var s=0;
		//while(s<intervals.length){
		//console.log('intervals.size',intervals.size);
		for (var s = 0; s < intervals.length && occupied.length<16; s++) {
			var first = intervals[s];
			var valid = true;
			//console.log('first',first);
			for (var o = 0; o < occupied.length; o++) {
				if (!(first.start >= occupied[o].start + occupied[o].size * 2 || first.start + 2 * first.size < occupied[o].start)) {
					valid = false;
					break;
				}
			}
			if (valid) {
				//console.log('first',first);
				var matching = 0;
				for (var i = 1; i < first.size; i++) {
					if (s + i >= intervals.length) {
						break;
					}
					var current = intervals[s + i];
					//console.log('current',current);
					if (current.start > first.start + i || current.size < first.size) {
						break;
					}
					if (current.start == first.start + i && current.size == first.size) {
						matching++;
						//console.log('matching',matching);
					}
				}
				var ratio = (matching + 1) / first.size;
				if (ratio > 4 / 5) {
					//console.log('found',first);
					occupied.push(first);
					//splits.push(first.start*8);
					//splits.push((first.start+first.size)*8);
					//splits.push((first.start+2*first.size)*8);
					//break;
				} //else{
				//console.log('wrong',first,ratio);
				//s++;
				//}
			}
		}
		for(var i=0;i<occupied.length;i++){
			var first=occupied[i];
			splits.push(first.start*8);
			//splits.push((first.start+2*first.size)*8);
			/*
			
			if(first.start>0){
				splits.push(first.start*8);
				}
			var lst=(first.start+2*first.size)*8;
			if(splits.length>1){
				if(splits[splits.length]<lst){
					splits.push(lst);
				}
			}else{
				splits.push(lst);
			}
			*/
			//splits.push((first.start+first.size)*8);
			/*if(i<occupied.length-1){
				var nx=occupied[i+1];
				if(first.start+2*first.size<nx.start){
					splits.push((first.start+2*first.size)*8);
				}
			}
			else{
				splits.push((first.start+2*first.size)*8);
			}*/
		}
		console.log('intervals', intervals);
		console.log('occupied', occupied);
		//var splits = [];
		return splits;
	}

	this.extractRiffs = function (padStart, riffSize) {
		//var patternArray = me.split8();
		me.parsedSong = new Song();
		//var padStart = 0;
		//var riffSize = 64;
		me.parsedSong.meter = riffSize;
		me.sureTuneStep(me.maxLastStep + riffSize);
		me.sureBeatStep(me.maxLastStep + riffSize);
		//console.log("extractRiffs");

		/*for (var i = 0; i < padStart; i++) {
		me.songBeatSteps.splice(0, 0, []);
		me.songTuneSteps.splice(0, 0, []);
		}

		me.maxLastStep = me.maxLastStep + padStart;
		//console.log(me.maxLastStep);
		var slotCount = Math.floor((me.maxLastStep - 1) / riffSize) + 1;
		me.maxLastStep = slotCount * riffSize;
		console.log("slotCount " + slotCount);
		me.sureTuneStep(me.maxLastStep);
		me.sureBeatStep(me.maxLastStep);
		//for(var i=0;i<3;i++){
		 */
		/*
		patternArray.patterns.sort(function (o1, o2) {
		//return o1.positions[0] - o2.positions[0];
		//return o2.pattern.length - o1.pattern.length;
		var r1=o1.pattern.length;
		var r2=o2.pattern.length;
		if(r1*8>=riffSize*1 && r1*8<=riffSize*2){
		r1=r1*0.001;
		}
		if(r2*8>=riffSize*1 && r2*8<=riffSize*2){
		r2=r2*0.001;
		}
		return r2-r1;
		});
		console.log('len', me.maxLastStep, patternArray);*/
		//var occuped = [];


		//var splits = [];

		var blocks = [];
		var indexes = [];
		for (var i = 0; i < me.songTuneSteps.length / 8; i++) {
			var b8 = me.getBlock8(i * 8);
			var idx = me.findBlockIndex(b8, blocks);
			indexes.push(idx);
			//if(i<5)console.log(b8);
			//console.log("/" + idx);
		}
		//console.log('blocks',blocks);
		//console.log('indexes',indexes);
		var dictionary = createDictionary(indexes);

		var splits = splitByDictionary(dictionary, indexes);
		//var fs=createFoursomes(dictionary);
		//console.log('fs',fs);
		//var splits=fillSplits(fs,indexes);

		//console.log('splits',splits);

		/*for (var t = 0; t < patternArray.patterns.length; t++) {
		//if(patternArray.patterns[t].positions[0]>=riffSize){
		occuped.push(patternArray.patterns[t]);
		//splits.push(patternArray.patterns[0].positions[0] * 8);
		for (var i = 0; i < patternArray.patterns[t].positions.length; i++) {
		splits.push(patternArray.patterns[t].positions[i] * 8);
		//splits.push(patternArray.patterns[t].positions[i] * 8+patternArray.patterns[t].pattern.length * 8);
		//nn = nn + splits[splits.length-1];
		}
		console.log('first pattern',t, patternArray.patterns[t]);
		break;
		//}
		}*/
		/*patternArray.patterns.sort(function (o1, o2) {
		//return o1.positions[0] - o2.positions[0];
		return o2.pattern.length - o1.pattern.length;
		});*/
		/*
		patternArray.patterns.sort(function (o1, o2) {
		return o2.pattern.length - o1.pattern.length
		});*/
		//var sorted = patternArray.patterns[0];
		//console.log('sorted', patternArray.patterns);


		//splits.push(48);
		//splits.push(48+128);
		//splits.push(48+128+80);
		//var nn = 0;
		//var occuped = [];

		/*
		for (var t = 0; t < patternArray.patterns.length; t++) {
		var curPattern = patternArray.patterns[t];
		if( curPattern.positions[0]*8>=riffSize){
		var exists = false;
		for (var k = 0; k < occuped.length; k++) {
		var exPattern = occuped[k];
		for (var c = 0; c < curPattern.positions.length; c++) {
		var cuPosition = curPattern.positions[c];
		var cuLen = curPattern.pattern.length;
		for (var e = 0; e < exPattern.positions.length; e++) {
		var exPosition = exPattern.positions[e];
		//console.log(e,exPattern.positions,exPosition);
		var exLen = exPattern.pattern.length;
		if (//
		(!(cuPosition >= exPosition + exLen +riffSize|| cuPosition + cuLen < exPosition))//
		) {
		exists = true;
		break;
		}
		}
		if (exists) {
		break;
		}
		}
		if (exists) {
		break;
		}
		}
		if (!exists) {
		occuped.push(curPattern);
		console.log('add pattern',t,curPattern);
		for (var i = 0; i < curPattern.positions.length; i++) {
		splits.push(curPattern.positions[i] * 8);
		//splits.push(curPattern.positions[i] * 8+curPattern.pattern.length * 8);
		//nn = nn + splits[splits.length-1];
		}
		}
		}
		}*/
		splits.push(0);
		splits.sort(function (o1, o2) {
			return o1 - o2;
		});
		console.log('add split', splits);
		//splits.push(me.maxLastStep - nn);*/
		var currentStep = 0;
		var xx = 0;
		var yy = 0;
		splits.push(me.maxLastStep + riffSize);
		
		for (var i = 0; i < splits.length; i++) {

			var splitCounter = splits[i] - currentStep;
			console.log('split', i, 'at', currentStep, 'size', splitCounter);
			if(splitCounter>0){
				while (splitCounter > riffSize) {
					this.parseSlot(currentStep, riffSize, riffSize, xx, yy);
					xx++;
					currentStep = currentStep + riffSize;
					splitCounter = splitCounter - riffSize;
				}
				if (splitCounter > 0) {
					this.parseSlot(currentStep, splitCounter, riffSize, xx, yy);
					currentStep = currentStep + splitCounter;
				}
				if (i > 0) {
					yy++;
					xx = 0;
				}
			}else{
				console.log('skip');
			}
		}
		/*
		var nn = 0;
		while (nn < me.maxLastStep) {
		//for (var i = 0; i < 50; i++) {
		var o = {};
		o.len = riffSize;
		o.nxt = false;
		console.log(nn,o.len);
		//if (((splits.length + 1) % 7.0) == 0) {
		if (nn > 0) {
		for(var i=0;i<patternArray.longest.positions.length;i++){
		console.log(nn,patternArray.longest.positions[i]);
		if(patternArray.longest.positions[i]==nn){
		o.nxt = true;
		}
		}
		}
		//}
		splits.push(o);
		nn = nn + riffSize;
		}
		 */

		//splits[2].len = 280;
		//splits[2].nxt = true;
		//splits[1].len = 116;
		//splits[4].nxt = true;
		//console.log("me.maxLastStep",me.maxLastStep);
		/*var len = 0;
		for (var i = 0; i < splits.length; i++) {
		len = len + splits[i].len;
		}
		console.log('len', len);*/
		/*me.sureTuneStep(len);
		me.sureBeatStep(len);*/
		/*var counter = 0;
		var xx = 0;
		var yy = 0;
		for (var i = 0; i < splits.length; i++) {
		console.log(counter);
		//console.log(splits[i]);
		//console.log(splits[i].len);
		if (splits[i].nxt ) {
		console.log('counter for split',counter);
		yy++;
		xx = 0;
		}
		if (splits[i].len <= riffSize) {
		this.parseSlot(counter, splits[i].len, riffSize, xx, yy);
		counter = counter + splits[i].len;
		} else {
		var m = 1;
		while (m < splits[i].len) {

		this.parseSlot(counter, riffSize, riffSize, xx, yy);
		counter = counter + riffSize;
		m = m + riffSize;
		xx++;
		//yy++;
		}
		var os = splits[i].len - m + riffSize;
		console.log('os', os);
		this.parseSlot(counter, os, riffSize, xx, yy);
		counter = counter + os;
		}
		xx++;
		}*/
		/*for (var i = 0; i < slotCount; i++) {
		this.parseSlot(i, riffSize);
		}*/
		//me.dumpBeatRiffs();
		//toolbox.dumpSong(me.parsedSong);
		console.log("riffs.length " + me.parsedSong.riffs.length);
		toolbox.sortSamples(me.parsedSong);
		/*for(var i=0;i<me.parsedSong.samples.length;i++){
		console.log(me.parsedSong.samples[i].path);
		}*/
	};
	this.parseSlot = function (skipSteps, riffSize, meter, px, py) {
		//console.log('skipSteps',skipSteps,'riffSize',riffSize,'meter',meter,'px',px,'py',py);
		var songPosition = toolbox.getPositionFromSong(px, py, me.parsedSong);
		if (riffSize < meter) {
			songPosition.length = riffSize;
		}
		me.parseSlotBeat(skipSteps, riffSize, meter, songPosition);
		me.parseSlotTunes(skipSteps, riffSize, meter, songPosition);
	};
	this.parseSlot2 = function (nn, riffSize) {
		//console.log("parseSlot: "+nn);
		/*
		for (var i = 0; i < nn; i++) {
		var xx = i % 4;
		var yy = Math.floor(i / 4);
		toolbox.getPositionFromSong(xx, yy, me.parsedSong);
		}*/
		var xx = nn % 4;
		var yy = Math.floor(nn / 4);
		var songPosition = toolbox.getPositionFromSong(xx, yy, me.parsedSong);

		me.parseSlotBeat(nn, riffSize, songPosition);
		me.parseSlotTunes(nn, riffSize, songPosition);
	};
	this.parseSlotBeat = function (nn, riffSize, meter, songPosition) {
		//console.log("parseSlotBeat: "+nn);
		var riff = new SongRiff();
		for (var i = 0; i < riffSize; i++) {
			var chordBeat = me.songBeatSteps[i + nn]; // * riffSize];
			if (!chordBeat) {
				chordBeat = [];
				me.songBeatSteps[i + nn] = chordBeat;
			}
			//console.log(i,nn,chordBeat);
			for (var t = 0; t < chordBeat.length; t++) {
				var sn = chordBeat[t];
				if (sn < 35 || sn > 81) {
					console.log("wrong midi drum n: " + sn);
					sn = 42;
				}

				var sample = toolbox.addSampleToSong(me.predefinedDrums[sn], me.parsedSong);
				sample.volume = 1.0;
				sample.isDrum = true;
				sample.midi = sn;
				toolbox.setBeatPointToRiff(i, sample.id, riff);
			}
		}
		toolbox.adjustArrayOfArray(riff.beat, meter);

		var rr = this.findOrAddRiffToSong(riff, riffSize);
		toolbox.addRiffIdToPosition(rr.id, songPosition);
	};
	this.parseSlotTunes = function (nn, riffSize, meter, songPosition) {
		//console.log("parseSlotTunes " + nn);
		for (var i = 0; i < riffSize; i++) {
			var chord = me.songTuneSteps[i + nn]; //* riffSize];
			if (!chord) {
				chord = [];
				me.songTuneSteps[i + nn] = chord;
			}
			for (var t = 0; t < chord.length; t++) {
				var sn = chord[t].instrument;
				if (sn < 0 || sn > 127) {
					console.log("unknown instrument: " + sn);
					sn = 0;
				}
				var sample = toolbox.addSampleToSong(me.predefinedInstruments[sn], me.parsedSong);
				sample.isDrum = false;
				sample.midi = sn;
			}
		}
		for (var i = 0; i < me.parsedSong.samples.length; i++) {
			var songSample = me.parsedSong.samples[i];
			//console.log("--songSample "+songSample.path)

			var songRiffTune = new SongRiffTune();
			toolbox.adjustArrayOfArray(songRiffTune.steps, meter);
			songRiffTune.sampleId = songSample.id;
			var found = false;
			for (var k = 0; k < riffSize; k++) {
				var chord = me.songTuneSteps[k + nn]; // * riffSize];
				//console.log("----check instrument " + songSample.path);
				for (var t = 0; t < chord.length; t++) {
					var midiNote = chord[t];

					//var n = "instrument" + midiNote.instrument;
					var sn = midiNote.instrument;
					if (sn < 0 || sn > 127) {
						sn = 0;
					}
					var samplePath = me.predefinedInstruments[sn];
					//console.log("------"+n);
					if (samplePath == songSample.path) {
						//console.log(midiNote);
						//console.log("------"+n+" equals "+songSample.path);
						toolbox.setTunePointToTune(k, midiNote.pitch, midiNote.length, midiNote.glissando, songRiffTune);
						// = function(step, pitch, length, shift, tune) {
						//console.log(songRiffTune);
						found = true;
					}
				}
			}

			if (found) {
				var songRiff = new SongRiff();
				toolbox.addTuneToRiff(songRiffTune, songRiff);
				//console.log("----found for "+toolbox.findSampleById(songRiffTune.sampleId, me.parsedSong).path);
				//console.log(songRiffTune);
				//}
				//if (!me.isRiffEmpty(songRiff)) {//instrument16
				//console.log(songRiff, riffSize);
				var rr = this.findOrAddRiffToSong(songRiff, riffSize);
				//var xx = nn % 4;
				//var yy = Math.floor(nn / 4);
				toolbox.addRiffIdToPosition(rr.id, songPosition);
				//console.log("----add riff for sample "+toolbox.findSampleById(songRiffTune.sampleId, me.parsedSong).path);
				//console.log(songRiff);
			} else {
				//console.log("----empty for sample "+toolbox.findSampleById(songRiffTune.sampleId, me.parsedSong).path);
			}

		}
	};
	this.isRiffEmpty = function (songRiff) {
		for (var i = 0; i < songRiff.beat.length; i++) {
			var chord = songRiff.beat[i];
			if (chord.length > 0) {
				return false;
			}
		}
		for (var i = 0; i < songRiff.tunes.length; i++) {
			var songRiffTune = songRiff.tunes[i];
			for (var k = 0; k < songRiffTune.steps.length; k++) {
				var chord = songRiffTune.steps[i];
				if (chord.length > 0) {
					return false;
				}
			}
		}
		return true;
	};
	this.findOrAddRiffToSong = function (riff, riffSize) {
		toolbox.adjustArrayOfArray(riff.beat, riffSize - 1);
		for (var i = 0; i < me.parsedSong.riffs.length; i++) {
			//console.log(riff, me.parsedSong.riffs[i], riffSize);
			if (this.isRiffEquals(riff, me.parsedSong.riffs[i], riffSize)) {
				return me.parsedSong.riffs[i];
			}
		}
		toolbox.addRiffToSong(riff, me.parsedSong);
		return riff;
	};
	this.isRiffEquals = function (r1, r2, meter) {
		var e12 = this.biRiffEquals(r1, r2, meter);
		var e21 = this.biRiffEquals(r2, r1, meter);
		var e = e12 && e21;
		//if(e){
		//console.log("isRiffEquals "+r1.id +" and "+r2.id);
		//}
		return e;
		//return this.biRiffEquals(r1, r2) && this.biRiffEquals(r2, r1);
	};
	this.biRiffEquals = function (r1, r2, meter) {
		if (!me.isRiffBeatPartEquals(r1, r2)) {
			return false;
		}
		if (!me.isRiffTunePartEquals(r1, r2, meter)) {
			return false;
		}
		return true;
	};
	this.isRiffBeatPartEquals = function (r1, r2) {
		if (r1.beat.length != r2.beat.length)
			return false;
		for (var i = 0; i < r1.beat.length; i++) {
			var beatChord1 = r1.beat[i];
			var beatChord2 = r2.beat[i];
			for (var t = 0; t < beatChord1.length; t++) {
				var found = false;
				for (var k = 0; k < beatChord2.length; k++) {
					if (beatChord2[k].sampleId == beatChord1[t].sampleId) {
						found = true;
						break;
					}
				}
				if (!found) {
					return false;
				}
			}
		}
		return true;
	};
	this.isRiffTunePartEquals = function (r1, r2, meter) {
		for (var i = 0; i < r1.tunes.length; i++) {
			var songRiffTune = r1.tunes[i];
			if (!me.isTuneExistsInTunes(songRiffTune, r2.tunes, meter)) {
				return false;
			}
		}
		//console.log("isRiffTunePartEquals "+r1.id +" == "+r2.id);
		return true;
	};
	this.isTuneExistsInTunes = function (t, tunes, meter) {
		for (var i = 0; i < tunes.length; i++) {
			var songRiffTune = tunes[i];
			if (me.isTunesEquals(t, songRiffTune, meter)) {
				return true;
			}
		}
		return false;
	};
	this.isTunesEquals = function (songRiffTune1, songRiffTune2, meter) {

		if (songRiffTune1.sampleId != songRiffTune1.sampleId) {
			return false;
		}
		toolbox.adjustArrayOfArray(songRiffTune1.steps, meter - 1);
		toolbox.adjustArrayOfArray(songRiffTune2.steps, meter - 1);
		for (var i = 0; i < meter; i++) {
			var chord1 = songRiffTune1.steps[i];
			var chord2 = songRiffTune2.steps[i];
			//console.log(chord1);
			//console.log(chord2);
			for (var s1 = 0; s1 < chord1.length; s1++) {
				var songRiffTunePoint1 = chord1[s1];
				var found = false;
				for (var s2 = 0; s2 < chord2.length; s2++) {
					var songRiffTunePoint2 = chord2[s2];
					if (songRiffTunePoint1.pitch == songRiffTunePoint2.pitch
						 && songRiffTunePoint1.length == songRiffTunePoint2.length
						 && songRiffTunePoint1.shift == songRiffTunePoint2.shift //
					) {
						found = true;
						break;
					}
				}
				if (!found) {
					return false;
				}
			}
		}
		return true;
	};

	this.dumpBeatRiffs = function () {
		//console.log(me.beatRiffs);
		for (var i = 0; i < me.beatRiffs.length; i++) {
			var beat = me.beatRiffs[i];
			//console.log(beat);
			var s = "" + i + " - ";
			for (var b = 0; b < beat.length; b++) {
				var chordBeat = beat[b];
				s = s + " " + b + ": ";
				for (var d = 0; d < chordBeat.length; d++) {
					s = s + "[" + chordBeat[d] + "]";
				}

			}
			console.log(s);
		}
	};
	this.dumpSong = function () {
		//console.log(me.songBeatSteps);
		//console.log(me.songTuneSteps);
		me.sureTuneStep(me.maxLastStep);
		me.sureBeatStep(me.maxLastStep);
		for (var i = 0; i < 99; i++) {
			//for (var i = 0; i < me.maxLastStep; i++) {
			var chordBeat = me.songBeatSteps[i];
			var chordTune = me.songTuneSteps[i];
			var s = "" + i + ": ";
			for (var d = 0; d < chordBeat.length; d++) {
				s = s + "[" + chordBeat[d] + "]";
			}
			s = s + ": ";
			for (var t = 0; t < chordTune.length; t++) {
				s = s + "(p" + chordTune[t].pitch + ",s" + chordTune[t].instrument + ",d" + chordTune[t].length + ",g" + chordTune[t].glissando + ")";
			}
			console.log(s);
			//if(i>256)break;
		}
	};
	this.parseTrack = function () {
		/*
		 * console.log(String.fromCharCode(me.readNextByte()));
		 * console.log(String.fromCharCode(me.readNextByte()));
		 * console.log(String.fromCharCode(me.readNextByte()));
		 * console.log(String.fromCharCode(me.readNextByte()));
		 */
		// console.log(me.readString(4));
		var id = me.readString(4); // new String(data, counter, 4);
		// counter = counter + 4;
		var len = me.read4BigEndian();
		var mem = me.counter;
		//console.log("parseTrack: id: " + id + ", len: " + len );
		if (id == "MTrk") {
			var stop = me.counter + len - 4;
			var baseDelta = 0;
			me.lastStep = 0;
			eventCount = 0;
			while (me.counter < stop && me.lastStep < me.limitImport) {
				baseDelta = me.readNextEvent(baseDelta);
			}
			if (me.maxLastStep < me.lastStep) {
				me.maxLastStep = me.lastStep;
			}
			if (me.maxLastStep > me.limitImport) {
				me.maxLastStep = me.limitImport;
			}
		} else {
			console.log("skip---------------------------------------");
		}
		me.counter = mem + len;

	};
	this.findProgram = function (channel, step) {
		for (var i = 0; i < me.programValues.length; i++) {
			var pChannel = me.programChannels[i];
			var pStep = me.programSteps[i];
			if (pChannel == channel && pStep <= step) {
				var pValue = me.programValues[i];
				return pValue;
			}
		}
		// console.log("no findProgram: channel " + channel + ", step " + step);
		return -1;
	};

	this.readNextEvent = function (deltatime) {
		eventCount++;
		var cudelta = me.readTimeDelta();
		var delta = deltatime + cudelta;
		me.lastStep = Math.round(delta / (me.ticksPerQuarter / 4.0));
		var status = me.readNextByte();
		//if(eventCount<eventCountStop)console.log("status: 0x" + status.toString(16)+",delta "+delta+", floor " +me.lastStep+" / "+(delta / (me.ticksPerQuarter / 4.0)));
		var n2 = 0;
		var n3 = 0;
		var len = 0;
		var prg = 0;
		var startCounter = 0;
		if (status == 0xff) { // Reset
			var kind = me.readNextByte();
			len = me.readNextByte();
			startCounter = me.counter;
			var tt = "?";
			var port = -1;
			switch (kind) {
			case 0x01:
				tt = me.readString(len);
				break;
			case 0x02:
				tt = me.readString(len);
				break;
			case 0x03:
				tt = me.readString(len);
				//console.log("status == 0xff: 0x" + kind.toString(16) + ": " + tt);
				break;
			case 0x04:
				tt = me.readString(len);
				break;
			case 0x05:
				tt = me.readString(len);
				break;
			case 0x06:
				tt = me.readString(len);
				break;
			case 0x07:
				tt = me.readString(len);
				break;
			case 0x08:
				tt = me.readString(len);
				break;
			case 0x09:
				tt = me.readString(len);
				break;
			case 0x20:
				tt = me.readString(len);
				break;
			case 0x21:
				port = me.readNextByte();
				break;
			case 0x2f:
				tt = me.readString(len);
				break;
			case 0x51:
				tt = me.readString(len);
				break;
			case 0x54:
				tt = me.readString(len);
				break;
			case 0x58:
				tt = me.readString(len);
				break;
			case 0x59:
				tt = me.readString(len);
				break;
			case 0x7f:
				tt = me.readString(len);
				break;
			default:
				//
				break;
			}
			//console.log("status == 0xff: 0x" + kind.toString(16) + ": " + tt+port);
			// counter = startCounter + len;
		} else {
			if (status == 0xf0) { // System exclusive (sysex) message
				len = me.readNextByte();
				startCounter = me.counter;
				me.counter = startCounter + len;
			} else {
				var ch = 0;
				if (status >= 0xb0 && status <= 0xbf) { // Controller
					ch = status & 0x0f;
					n2 = me.readNextByte();
					n3 = me.readNextByte();
					// System.out.println("\tcontrol x" +
					// Integer.toHexString(n2) + "/x" + Integer.toHexString(n3)
					// + " for channel " + ch);
				} else {
					if (status >= 0xc0 && status <= 0xcf) { // Program change
						n2 = me.readNextByte();
						ch = status & 0x0f;
						if (eventCount < eventCountStop)
							//console.log("program " + n2 + " for channel " + ch + ", delta " + delta);
							// programValues.addElement(new Integer(n2));
							// programDelta.addElement(new Integer(delta));
							// programChannels.addElement(new Integer(ch));
							me.programValues[me.programValues.length] = n2;
						me.programSteps[me.programSteps.length] = me.lastStep;
						me.programChannels[me.programChannels.length] = ch;
					} else {
						if (status >= 0x90 && status <= 0x9f) { // Note on
							me.currentEventChannel = status & 0x0f;
							n2 = me.readNextByte();
							n3 = me.readNextByte();
							// System.out.println("\tnoteOn, n2: " + n2 + ", n3:
							// " + n3);
							if (me.currentEventChannel == 9) {
								//me.setBeat(me.lastStep, n2);
								if (n2 < 35 || n2 > 81) {
									console.log("raw setBeat: wrong midi drum n: " + n2);
								} else {
									//if(n2==75){
									//console.log("raw setBeat: wrong parser hook last drum n: " + n2+"/"+me.lastStep);
									//}else{
									//console.log("raw setBeat: "+me.lastStep+", n2: " + n2);
									me.setBeat(me.lastStep, n2);
									//}
								}
							} else {
								prg = me.findProgram(me.currentEventChannel, me.lastStep);
								if (n3 == 0) { //volume 0
									// System.out.println("\t\t=noteOff");
									//console.log("stopNote channel: "+me.currentEventChannel+", pitch: "+ n2+", stopDelta: "+ delta+", gliss: "+ -Math.floor(me.currentBend[me.currentEventChannel] * 1.01));
									me.stopNote(me.currentEventChannel, n2, me.lastStep, -Math.floor(me.currentBend[me.currentEventChannel] * 1.01));
								} else {
									/*if (n3 < 70) {
									prg = prg + 128;
									}*/
									me.startTune(me.currentEventChannel, me.lastStep, n2, prg);
									//console.log("note start: channel: "+me.currentEventChannel+", pitch: "+ n2+", stopDelta: "+ delta);
									//me.notePitches[me.notePitches.length] = n2;
									//me.noteChannels[me.noteChannels.length] = me.currentEventChannel;
									//me.noteSteps[me.noteSteps.length] = me.lastStep;
								}
							}
						} else {
							if (status >= 0x80 && status <= 0x8f) { // Note off
								ch = status & 0x0f;
								n2 = me.readNextByte();
								n3 = me.readNextByte();
								// System.out.println("\tnoteOff, n2: " + n2 +
								// ", n3: " + n3);
								if (ch != 9) {
									me.stopNote(ch, n2, me.lastStep, -Math.floor(me.currentBend[ch] * 1.01));
								}
							} else {
								if (status >= 0xe0 && status <= 0xef) { // Pitch
									// /
									// modulation
									// wheel
									ch = status & 0x0f;
									n2 = me.readNextByte();
									n3 = me.readNextByte();
									var bendCount = me.bendSizeA[ch] - 1;
									if (bendCount < 1) {
										bendCount = 36;
									}
									var bendStep = 0x1fff / bendCount;
									var bnd = (me.from14(n2, n3) - 0x2000) / bendStep;
									me.currentBend[ch] = bnd;
									// System.out.println("\tbend: " + bnd);
								} else {
									if (status >= 0xa0 && status <= 0xaf) { // Aftertouch
										// /
										// key
										// pressure
										n2 = me.readNextByte();
										n3 = me.readNextByte();
									} else {
										if (status >= 0xd0 && status <= 0xdf) { // Channel
											// pressure
											n2 = me.readNextByte();
										} else {
											if (status >= 0xf1) { // MIDI time
												// code
												// quarter
												// frame
												//
											} else {
												if (status >= 0xf2) { // Song
													// position
													// pointer
													n2 = me.readNextByte();
													n3 = me.readNextByte();
												} else {
													if (status >= 0xf3) { // Song select
														n2 = me.readNextByte();
													} else {
														if (status >= 0xf6) { // Tune request
															//
														} else {
															if (status >= 0xf8) { // MIDI clock
																//
															} else {
																if (status >= 0xfa) { // MIDI start
																	//
																} else {
																	if (status >= 0xfb) { // MIDI continue
																		//
																	} else {
																		if (status >= 0xfc) { // MIDI stop
																			//
																		} else {
																			if (status >= 0xfe) { // Active sense
																				//
																			} else {
																				if (status < 0x80) { //proceed squized command
																					n2 = status;
																					n3 = me.readNextByte();
																					// System.out.println("\t\tcontinue
																					// noteOn,
																					// n2:
																					// " +
																					// n2 +
																					// ",
																					// n3:
																					// " +
																					// n3);
																					if (me.currentEventChannel == 9) {
																						if (n2 < 35 || n2 > 81) {
																							console.log("squized setBeat: wrong midi drum n: " + n2);
																						} else {
																							me.setBeat(me.lastStep, n2);
																						}
																					} else {
																						prg = me.findProgram(me.currentEventChannel, me.lastStep); //+ 1;
																						if (n3 == 0) {
																							// System.out.println("\t\t=noteOff");
																							//if(eventCount<eventCountStop)console.log("stopNote due n3=0");
																							me.stopNote(me.currentEventChannel, n2, me.lastStep, -Math.floor(me.currentBend[me.currentEventChannel] * 1.01));
																						} else {
																							/*if (n3 < 70) {
																							prg = prg + 128;
																							}*/
																							//if(eventCount<eventCountStop)console.log(me.currentEventChannel);
																							me.startTune(me.currentEventChannel, me.lastStep, n2, prg);
																							//console.log("sq note start: channel: "+me.currentEventChannel+", pitch: "+ n2+", stopDelta: "+ delta);
																							//me.notePitches[me.notePitches.length] = n2;
																							//me.noteChannels[me.noteChannels.length] = me.currentEventChannel;
																							//me.noteSteps[me.noteSteps.length] = me.lastStep;
																						}
																					}

																				} else {
																					n2 = me.readNextByte();
																					n3 = me.readNextByte();
																					console.log("\tunknown " + Integer.toHexString(status) + ": " + Integer.toHexString(n2) + "/" + Integer.toHexString(n3));
																				}
																			}
																		}
																	}
																}
															}
														}
													}
												}
											}
										}
									}
								}
							}
						}
					}
				}
			}
		}
		return delta;
	};
	this.sureBeatStep = function (n) {
		for (var i = me.songBeatSteps.length; i <= n; i++) {
			me.songBeatSteps[i] = [];
		}
	}
	this.setBeat = function (step, drum) {

		// console.log("setBeat "+step+": "+drum);
		me.sureBeatStep(step);
		var chord = me.songBeatSteps[step];
		for (var i = 0; i < chord.length; i++) {
			if (chord[i] == drum) {
				return;
			}
		}
		chord[chord.length] = drum;
	};
	this.sureTuneStep = function (n) {
		for (var i = me.songTuneSteps.length; i <= n; i++) {
			me.songTuneSteps[i] = [];
		}
	}
	/*
	this.setTune = function(channel,step, pitch, instrument, length, glissando) {
	if(eventCount<eventCountStop)console.log("setTune channel: "+channel+", step: "+step+", pitch: "+pitch+", instr: "+instrument+", len: "+length+", gliss: "+glissando);
	me.notePitches[me.notePitches.length] = pitch;
	me.noteChannels[me.noteChannels.length] = channel;
	me.noteSteps[me.noteSteps.length] = step;
	if (!me.findTune(step, pitch, instrument)) {
	// me.sureTuneStep(step);
	var chord = me.songTuneSteps[step];
	/
	 * for ( var i = 0; i < chord.length; i++) { if (chord[i].instrument ==
	 * instrument && chord[i].pitch == pitch) { return; } }
	/
	var point = new MIDINote();
	point.pitch = pitch;
	point.instrument = instrument;
	point.length = length;
	point.glissando = glissando;
	chord[chord.length] = point;
	//console.log(point);
	}
	};
	 */
	this.startTune = function (channel, step, pitch, instrument) {
		//if(eventCount<eventCountStop)console.log("startTune channel: "+channel+", step: "+step+", pitch: "+pitch+", instr: "+instrument+", cache "+me.notePitches.length);

		if (!me.findTune(step, pitch, instrument)) {
			var chord = me.songTuneSteps[step];
			var point = new MIDINote();
			point.pitch = pitch;
			point.instrument = instrument;
			point.length = 1;
			point.glissando = 0;
			chord[chord.length] = point;
			me.notePitches[me.notePitches.length] = pitch;
			me.noteChannels[me.noteChannels.length] = channel;
			me.noteSteps[me.noteSteps.length] = step;
		}
	};
	this.stopTune = function (channel, step, pitch, instrument, length, glissando) {
		//if(eventCount<eventCountStop)console.log("     stopTune channel: "+channel+", step: "+step+", pitch: "+pitch+", instr: "+instrument+", len: "+length+", gliss: "+glissando+", cache "+me.notePitches.length);
		//me.notePitches[me.notePitches.length] = pitch;
		//me.noteChannels[me.noteChannels.length] = channel;
		//me.noteSteps[me.noteSteps.length] = step;
		if (length > 64) {
			length = 64;
		}
		if (me.findTune(step, pitch, instrument)) {
			var chord = me.songTuneSteps[step];
			for (var i = 0; i < chord.length; i++) {
				if (chord[i].instrument == instrument && chord[i].pitch == pitch) {
					//chord[i].pitch = pitch;
					//chord[i].instrument = instrument;
					chord[i].length = length;
					if (chord[i].length == 0) {
						chord[i].length = 1;
					}
					chord[i].glissando = glissando;
					break;
				}
			}
		} else {
			/*
			var chord = me.songTuneSteps[step];
			var point = new MIDINote();
			point.pitch = pitch;
			point.instrument = instrument;
			point.length = length;
			point.glissando = glissando;
			chord[chord.length] = point;
			 */
		}
	};
	this.findTune = function (step, pitch, instrument) {
		//console.log("findTune "+step+": "+pitch+": "+instrument);
		me.sureTuneStep(step);
		var chord = me.songTuneSteps[step];
		//console.log(step+": "+chord);
		for (var i = 0; i < chord.length; i++) {
			if (chord[i].instrument == instrument && chord[i].pitch == pitch) {
				return true;
			}
		}
		return false;
	};

	this.stopNote = function (channel, pitch, stopStep, glissando) {
		//if(eventCount<eventCountStop)console.log("       stopNote channel: "+channel+", step: "+stopStep+", pitch: "+ pitch+", instr: ?, len: ?, gliss: "+ glissando+" ("+me.notePitches.length+")");

		//if(glissando!=0)console.log(glissando);
		var notFound = true;
		for (var i = 0; i < me.notePitches.length; i++) {
			var notePitch = me.notePitches[i];
			var noteChannel = me.noteChannels[i];
			var noteStep = me.noteSteps[i];

			if (notePitch == pitch && noteChannel == channel && noteStep <= stopStep) {

				var instrument = me.findProgram(channel, stopStep);
				//console.log(stopDelta);
				var len = (stopStep - noteStep); // / (me.ticksPerQuarter / 4.0) - 1;

				if (len >= 0) {
					//var step = Math.floor(noteDelta / (me.ticksPerQuarter / 4));
					if (me.findTune(noteStep, pitch, instrument)) {
						me.stopTune(channel, noteStep, pitch, instrument, len, glissando);
						me.notePitches.splice(i, 1);
						me.noteChannels.splice(i, 1);
						me.noteSteps.splice(i, 1);
						notFound = false;
						//if(eventCount<eventCountStop)console.log("         now cache "+me.notePitches.length);
						/*} else {
						if (me.findTune(step, pitch , instrument + 1 + 128)) {
						me.setTune(step, pitch , instrument + 1 + 128,
						len, glissando);*/
						break;
					}
					/*else {
					console.log("no tune for " + instrument);
					}*/
					//}
				}
				break;
			}
		}
		if (notFound) {
			if (eventCount < eventCountStop)
				console.log("              stopNote! no tune channel: " + channel + ", step: " + stopStep + ", pitch: " + pitch + ", instr: ?, len: ?, gliss: " + glissando + " (" + me.notePitches.length + ")");
		}
	};
	this.readTimeDelta = function () {
		var timeDelta = 0;
		var b = 0;
		do {
			b = me.readNextByte();
			timeDelta = (timeDelta << 7) + (b & 0x7f);
		} while ((b & 0x80) != 0);
		return timeDelta;
	};
	this.from14 = function (lsb, msb) {
		var r = msb << 7;
		r = r + lsb;
		return r;
	};
	this.readString = function (len) {
		var r = "";
		for (var i = 0; i < len; i++) {
			r = r + String.fromCharCode(me.readNextByte());
		}
		return r;
	};
	this.read4BigEndian = function () {
		var byte0 = me.unsignedByte(me.dataView.getUint8(me.counter + 0));
		var byte1 = me.unsignedByte(me.dataView.getUint8(me.counter + 1));
		var byte2 = me.unsignedByte(me.dataView.getUint8(me.counter + 2));
		var byte3 = me.unsignedByte(me.dataView.getUint8(me.counter + 3));
		var r = byte0 * 256 * 256 * 256 + byte1 * 256 * 256 + byte2 * 256 + byte3;
		me.counter = me.counter + 4;
		return r;
	};
	this.read2BigEndian = function () {
		var byte0 = me.unsignedByte(me.dataView.getUint8(me.counter + 0));
		var byte1 = me.unsignedByte(me.dataView.getUint8(me.counter + 1));
		var r = byte0 * 256 + byte1;
		me.counter = me.counter + 2;
		return r;
	};
	this.readNextByte = function () {
		if (me.counter >= me.dataView.byteLength) {
			// System.out.println("ops " + counter + "/" + data.length);
			console.log("MidiParser.readNextByte: " + me.counter + " >= " + me.dataView.byteLength);
		}
		var r = me.unsignedByte(me.dataView.getUint8(me.counter + 0));
		// System.out.println(counter + ": " + r + " = x" +
		// Integer.toHexString(r));
		me.counter++;
		return r;
	};
	this.unsignedByte = function (b) {
		return b & 0xFF;
	};
	return this;
}

function PatternArray(s) {
	this.positions = [];
	this.patterns = [];
	this.from = [];
	this.meterRatio = 8;
	this.firstCommon = function (arr1, arr2, limit) {
		var r = [];
		var to = arr1.length;
		if (arr2.length < to) {
			to = arr2.length;
		}
		if (limit < to) {
			to = limit;
		}
		var f = 0;
		for (var i = 0; i < to; i++) {
			if (arr1[i] != arr2[i]) {
				break;
			}
			f = i + 1;
		}
		for (var i = 0; i < f; i++) {
			r.push(arr1[i]);
		}

		return r;
	};
	this.bsort = function (a, key) {
		var len = a.length;
		var buckets = [];
		var i = len;
		var j = -1;
		var b;
		var d = 0;
		var keys = 0;
		var bits;
		var key = key || identity;
		while (i--) {
			j = Math.max(key(a[i]), j);
		}
		bits = j >> 24 && 32 || j >> 16 && 24 || j >> 8 && 16 || 8;
		for (; d < bits; d += 4) {
			for (i = 16; i--; ) {
				buckets[i] = [];
			}
			for (i = len; i--; ) {
				buckets[(key(a[i]) >> d) & 15].push(a[i]);
			}
			for (b = 0; b < 16; b++) {
				for (j = buckets[b].length; j--; ) {
					a[++i] = buckets[b][j];
				}
			}
		}
		return a;
	};
	this.fill = function (s) {
		this.from = s;
		var len = s.length;
		var array = [];
		var swap = [];
		var order = [];
		var span;
		var sym;
		var i = len;
		while (i--) {
			array[i] = s[i];
			order[i] = i;
		}
		for (span = 1; sym != len && span < len; span *= 2) {
			this.bsort(order, function (i) {
				return array[(i + span) % len]
			});
			this.bsort(order, function (i) {
				return array[i]
			});
			sym = swap[order[0]] = 1;
			for (i = 1; i < len; i++) {
				if (array[order[i]] != array[order[i - 1]] || array[(order[i] + span) % len] != array[(order[i - 1] + span) % len]) {
					sym++;
				}
				swap[order[i]] = sym;
			}
			tmp = array;
			array = swap;
			swap = tmp;
		};
		this.positions = order;
		for (var i = 1; i < this.positions.length; i++) {
			var a = this.firstCommon(this.from.slice(this.positions[i]) //
				, this.from.slice(this.positions[i - 1]) //
				, Math.abs(this.positions[i] - this.positions[i - 1]) //
				);
			if (a.length > 2) { // && a.length<this.meterRatio+1){
				if (!this.existsPattern(a)) {
					var pos = this.findAll(a);
					if (pos.length > 1) {
						var o = {
							pattern : a,
							positions : pos
						};
						this.patterns.push(o);
					}
				}
			}
		}
		/*this.patterns.sort(function (o1, o2) {
		return o2.pattern.length - o1.pattern.length
		});
		this.longest = this.patterns[0];*/
	};
	this.existsPattern = function (pattern) {
		for (var i = 0; i < this.patterns.length; i++) {
			var cu = this.patterns[i];
			if (cu.length == pattern.length) {
				var equals = true;
				for (var k = 0; k < pattern.length; k++) {
					if (cu[k] != pattern[k]) {
						equals = false;
						break;
					}
				}
				if (equals) {
					return true;
				}
			}
		}
		return false;
	};
	this.findAll = function (pattern) {
		var f = [];
		for (var i = 0; i < this.from.length - pattern.length; i++) {
			var equals = true;
			for (var k = 0; k < pattern.length; k++) {
				if (this.from[i + k] != pattern[k]) {
					equals = false;
					break;
				}
			}
			if (equals) {
				f.push(i);
				i = i + pattern.length - 1;
			}
		}
		return f;
	};
	this.fill(s);
	return this;
}
/*
console.log("test start -------------------------");
function arrayEquals(a1, a2) {
if (a1.length == a2.length) {
return false;
}
for (var i = 0; i < a1.length; i++) {
if (a1[i] != a2[i]) {
return false;
}
}
return true;
};
function arraySingle(a1, n) {
if (a1.length != 1) {
return false;
}
if (a1[0] != n) {
return false;
}
return true;
};

ABranch = function () {
this.value = [];
this.leaves = [];
this.branches = [];
};

ABranch.prototype.checkBranches = function (arr) {
var node;
for (var i = 0; i < this.branches.length; i++) {
//node = this.branches[i];
node = this.branches[i];
//console.log(node.value);
if (arraySingle(node.value, arr[0])) {
//if (node.value == suf[0]) {
node.addSuffix(arr.slice(1));
return true;
}
}
return false;
};

ABranch.prototype.checkLeaves = function (arr) {
var node;
var leaf;
//console.log(arr);
for (var i = 0; i < this.leaves.length; i++) {

//leaf = this.leaves[i];
leaf = this.leaves.slice(i, i + 1);
//console.log(i,this.leaves[i],leaf , arr[0]);
if (leaf == arr[0]) {
node = new ABranch();
node.value = leaf.slice(0, 1);
node.addSuffix(arr.slice(1));
node.addSuffix(leaf.slice(1));
this.branches.push(node);
this.leaves.splice(i, 1);
return;
}
}
this.leaves.push(arr);
};

ABranch.prototype.addSuffix = function (arr) {
if (arr.length > 0) {
if (!this.checkBranches(arr)) {
this.checkLeaves(arr);
}
}
};

ABranch.prototype.getLongestRepeatedSubString = function () {
var str = [];
var temp = [];
for (var i = 0; i < this.branches.length; i++) {
temp = this.branches[i].getLongestRepeatedSubString();
if (temp.length > str.length) {
str = temp;
}
}
var r = this.value.slice();
r.push(str);
//return this.value + str;
return r;
};
ABranch.prototype.dump = function (tab) {
console.log(tab + this.value);
for (var i = 0; i < this.branches.length; i++) {
this.branches[i].dump(". " + tab);
}
};
SuffixTree = function (arr) {
this.tree = new ABranch();
for (var i = 0; i < arr.length; i++) {
this.tree.addSuffix(arr.slice(i));
}
}
//var s=new SuffixTree("missisippissi$");
var s = new SuffixTree([3, 3, 3, 2, 1, 1, 1, 4, -1]);
console.log(s);
//console.log(s.tree.dump());
s.tree.dump("");
console.log("test done --------------------------");
*/
function MixSample() {
	var me = this;
	me.stepDelta = 0;
	//me.bufferSize = 0;
	//me.dataView = null;
	//me.dataViewByteLength = 0;
	me.signed=null;
	me.currentIndex = 0;
	me.volume = 1.0;
	me.unused = false;
	me.isDrum = false;
	me.stepShift = 0;
	me.loopEnd = 0;
	me.loopStart = 0;
	me.noteLength = 0;
	me.soundLength = 0;
	me.lengthIndex = 0;
	return me;
}
function Mixer() {
	var me = this;
	this.pcm = new Pcm();
	this.frequencies = [16.35 // C0
	, 17.32 // C#0/Db0
	, 18.35 // D0
	, 19.45 // D#0/Eb0
	, 20.60 // E0
	, 21.83 // F0
	, 23.12 // F#0/Gb0
	, 24.50 // G0
	, 25.96 // G#0/Ab0
	, 27.50 // A0
	, 29.14 // A#0/Bb0
	, 30.87 // B0
	, 32.70 // C1
	, 34.65 // C#1/Db1
	, 36.71 // D1
	, 38.89 // D#1/Eb1
	, 41.20 // E1
	, 43.65 // F1
	, 46.25 // F#1/Gb1
	, 49.00 // G1
	, 51.91 // G#1/Ab1
	, 55.00 // A1
	, 58.27 // A#1/Bb1
	, 61.74 // B1
	, 65.41 // C2
	, 69.30 // C#2/Db2
	, 73.42 // D2
	, 77.78 // D#2/Eb2
	, 82.41 // E2
	, 87.31 // F2
	, 92.50 // F#2/Gb2
	, 98.00 // G2
	, 103.83 // G#2/Ab2
	, 110.00 // A2
	, 116.54 // A#2/Bb2
	, 123.47 // B2
	, 130.81 // C3
	, 138.59 // C#3/Db3
	, 146.83 // D3
	, 155.56 // D#3/Eb3
	, 164.81 // E3
	, 174.61 // F3
	, 185.00 // F#3/Gb3
	, 196.00 // G3
	, 207.65 // G#3/Ab3
	, 220.00 // A3
	, 233.08 // A#3/Bb3
	, 246.94 // B3
	, 261.63 // C4
	, 277.18 // C#4/Db4
	, 293.66 // D4
	, 311.13 // D#4/Eb4
	, 329.63 // E4
	, 349.23 // F4
	, 369.99 // F#4/Gb4
	, 392.00 // G4
	, 415.30 // G#4/Ab4
	, 440.00 // A4
	, 466.16 // A#4/Bb4
	, 493.88 // B4
	, 523.25 // C5
	, 554.37 // C#5/Db5
	, 587.33 // D5
	, 622.25 // D#5/Eb5
	, 659.26 // E5
	, 698.46 // F5
	, 739.99 // F#5/Gb5
	, 783.99 // G5
	, 830.61 // G#5/Ab5
	, 880.00 // A5
	, 932.33 // A#5/Bb5
	, 987.77 // B5
	, 1046.50 // C6
	, 1108.73 // C#6/Db6
	, 1174.66 // D6
	, 1244.51 // D#6/Eb6
	, 1318.51 // E6
	, 1396.91 // F6
	, 1479.98 // F#6/Gb6
	, 1567.98 // G6
	, 1661.22 // G#6/Ab6
	, 1760.00 // A6
	, 1864.66 // A#6/Bb6
	, 1975.53 // B6
	, 2093.00 // C7
	, 2217.46 // C#7/Db7
	, 2349.32 // D7
	, 2489.02 // D#7/Eb7
	, 2637.02 // E7
	, 2793.83 // F7
	, 2959.96 // F#7/Gb7
	, 3135.96 // G7
	, 3322.44 // G#7/Ab7
	, 3520.00 // A7
	, 3729.31 // A#7/Bb7
	, 3951.07 // B7
	, 2093.00 * 2.0 //
	, 2217.46 * 2.0 //
	, 2349.32 * 2.0 //
	, 2489.02 * 2.0 //
	, 2637.02 * 2.0 //
	, 2793.83 * 2.0 //
	, 2959.96 * 2.0 //
	, 3135.96 * 2.0 //
	, 3322.44 * 2.0 //
	, 3520.00 * 2.0 //
	, 3729.31 * 2.0 //
	, 3951.07 * 2.0 //
	, 2093.00 * 2.0 * 2.0 //
	, 2217.46 * 2.0 * 2.0 //
	, 2349.32 * 2.0 * 2.0 //
	, 2489.02 * 2.0 * 2.0 //
	, 2637.02 * 2.0 * 2.0 //
	, 2793.83 * 2.0 * 2.0 //
	, 2959.96 * 2.0 * 2.0 //
	, 3135.96 * 2.0 * 2.0 //
	, 3322.44 * 2.0 * 2.0 //
	, 3520.00 * 2.0 * 2.0 //
	, 3729.31 * 2.0 * 2.0 //
	, 3951.07 * 2.0 * 2.0 //
	, 2093.00 * 2.0 * 2.0 * 2.0 //
	, 2217.46 * 2.0 * 2.0 * 2.0 //
	, 2349.32 * 2.0 * 2.0 * 2.0 //
	, 2489.02 * 2.0 * 2.0 * 2.0 //
	, 2637.02 * 2.0 * 2.0 * 2.0 //
	, 2793.83 * 2.0 * 2.0 * 2.0 //
	, 2959.96 * 2.0 * 2.0 * 2.0 //
	, 3135.96 * 2.0 * 2.0 * 2.0
		//
	];
	/*this.showMixError = function () {
	console.log("can't cache");
	alert("ops");
	};*/
	me.decayRatio = 0.9995;
	me.mixSongPosition = null;
	me.mix16Counter = 0;
	me.mixBarCounter = 0;
	me.mixSampleRate = 0;
	me.mixSong = null;
	me.mixSamples = [];
	me.buffer16size = 0; //me.pcm.sampleRate * (60.0 / 4.0) / me.mixSong.tempo;
	this.calculateMixBarDrum = function (mixSample) {
		var volume=0;
		//var roundIndex = ~~mixSample.currentIndex;
		if (mixSample.currentIndex < mixSample.signed.length ) {
		//if (mixSample.currentIndex < mixSample.dataViewByteLength ) {
			//volume =  mixSample.volume * mixSample.dataView.getInt8(mixSample.currentIndex);
			volume =  mixSample.volume * mixSample.signed[~~mixSample.currentIndex];
			mixSample.currentIndex = mixSample.currentIndex + mixSample.stepDelta;
		} else {
			mixSample.unused = true;
		}
		return volume;
	};
	this.adjustMixBarInstrumentLoop = function (mixSample) {
		if (mixSample.loopEnd > 0) {
				if (mixSample.currentIndex >= mixSample.loopEnd) {
					mixSample.currentIndex = mixSample.currentIndex - (mixSample.loopEnd - mixSample.loopStart);
				}
			}
	};
	this.adjustMixBarInstrumentDecay = function (mixSample) {
		if (mixSample.lengthIndex > mixSample.noteLength) {
				if (mixSample.lengthIndex > mixSample.soundLength) {
					mixSample.unused = true;
				}else{
					mixSample.volume=mixSample.volume*me.decayRatio;
				}
			}
	};
	this.adjustMixBarInstrumentIndex = function (mixSample) {
		mixSample.currentIndex = mixSample.currentIndex + mixSample.stepDelta;
		mixSample.stepDelta = mixSample.stepDelta + mixSample.stepShift;			
		mixSample.lengthIndex++;
	};
	this.calculateMixBarInstrument = function (mixSample) {
		var volume=0;
		//var roundIndex = ~~mixSample.currentIndex;
		
		//if (mixSample.currentIndex < mixSample.dataViewByteLength && mixSample.currentIndex>-1) {
		if (mixSample.currentIndex < mixSample.signed.length && mixSample.currentIndex>-1) {
			//volume = mixSample.volume * mixSample.dataView.getInt8(mixSample.currentIndex);
			volume = mixSample.volume * mixSample.signed[~~mixSample.currentIndex];
			this.adjustMixBarInstrumentIndex(mixSample);
			this.adjustMixBarInstrumentLoop(mixSample);
			this.adjustMixBarInstrumentDecay(mixSample);
		} else {
			mixSample.unused = true;
		}
		return volume;
	};
	this.calculateMixBar = function () {
		var volume = 0;
		for (var i = 0; i < me.mixSamples.length; i++) {
			var mixSample = me.mixSamples[i];
			if (!mixSample.unused) {
				if (mixSample.isDrum) {
					volume = volume +this.calculateMixBarDrum(mixSample);
					/*
					var roundIndex = Math.round(mixSample.currentIndex);
					if (roundIndex < mixSample.dataViewByteLength && roundIndex>-1) {
						volume = volume + mixSample.volume * mixSample.dataView.getInt8(roundIndex);
						mixSample.currentIndex = mixSample.currentIndex + mixSample.stepDelta;
					} else {
						mixSample.unused = true;
					}
					*/
				} else {
					volume = volume +this.calculateMixBarInstrument(mixSample);
					/*
					var roundIndex = Math.round(mixSample.currentIndex);
					if (roundIndex < mixSample.dataViewByteLength && roundIndex>-1) {
						volume = volume + mixSample.volume * mixSample.dataView.getInt8(roundIndex);
						mixSample.currentIndex = mixSample.currentIndex + mixSample.stepDelta;
						mixSample.stepDelta = mixSample.stepDelta + mixSample.stepShift;
						if (mixSample.loopEnd > 0) {
							if (Math.round(mixSample.currentIndex) >= mixSample.loopEnd) {
								mixSample.currentIndex = mixSample.currentIndex - (mixSample.loopEnd - mixSample.loopStart);
							}
						}
						mixSample.lengthIndex++;

						if (mixSample.lengthIndex > mixSample.noteLength) {
							if (mixSample.lengthIndex > mixSample.soundLength) {
								mixSample.unused = true;
							}else{
								mixSample.volume=mixSample.volume*me.decayRatio;
							}
						}
					} else {
						mixSample.unused = true;
					}
					*/
				}
			}
		}
		return volume;
	};
	this.addMixDrum = function (sample) {
		var mixSample = new MixSample();
		var sampleFrequency = this.frequencies[Math.floor(sample.basePitch)];
		var startFrequency = this.calculateFrequency(sample.basePitch, sample.basePitch, sample.correction);
		mixSample.stepDelta = (startFrequency / sampleFrequency) * (sample.sampleRate / me.mixSampleRate);//me.pcm.sampleRate);
		//mixSample.bufferSize = 64 * me.buffer16size;
		//var arrayBuffer = app.cache.findBuffer(sample.path);
		mixSample.isDrum = true;
		//mixSample.dataView = new DataView(arrayBuffer);
		//mixSample.dataViewByteLength = arrayBuffer.byteLength;
		mixSample.signed=app.cache.findSigned(sample.path);
		//console.log(mixSample.signed);
		mixSample.volume = sample.volume;
		me.mixSamples[me.mixSamples.length] = mixSample;
		//console.log("addMixDrum", mixSample);
	};
	this.addMixInstrument = function (sample, songRiffTunePoint) {
		//me.addPitchSample(sixteenth, start16 + s, signed, instrument, songRiffTunePoint.pitch, songRiffTunePoint.length, songRiffTunePoint.shift);
		//this.addPitchSample = function (sixteenth, start, signedArray, sample, startPitch, length, shift) {
		//var sampleFrequency = 0.25 * this.frequencies[Math.floor(sample.basePitch)];
		//var startFrequency = this.calculateFrequency(startPitch, sample.basePitch, sample.correction);
		//var endFrequency = this.calculateFrequency(startPitch + shift, sample.basePitch, sample.correction);


		var mixSample = new MixSample();
		var sampleFrequency = 0.25 * this.frequencies[Math.floor(sample.basePitch)];
		var startFrequency = this.calculateFrequency(songRiffTunePoint.pitch, sample.basePitch, sample.correction);
		var endFrequency = this.calculateFrequency(songRiffTunePoint.pitch + songRiffTunePoint.shift, sample.basePitch, sample.correction);
		var ringLength = me.buffer16size * (songRiffTunePoint.length+0);
		//var stepDelta = (startFrequency / sampleFrequency) * (sample.sampleRate / me.pcm.sampleRate);
		var endDelta = (endFrequency / sampleFrequency) * (sample.sampleRate / me.mixSampleRate);//me.pcm.sampleRate);me.pcm.sampleRate);
		//var stepShift = (endDelta - stepDelta) / ringLength;

		mixSample.noteLength = ringLength;
		mixSample.soundLength = me.buffer16size * (songRiffTunePoint.length + 4);
		mixSample.stepDelta = (startFrequency / sampleFrequency) * (sample.sampleRate / me.mixSampleRate);//me.pcm.sampleRate);me.pcm.sampleRate);
		mixSample.stepShift = (endDelta - mixSample.stepDelta) / ringLength;
		//mixSample.bufferSize = ringLength; //64 * me.buffer16size;
		mixSample.loopEnd = sample.loopEnd;
		mixSample.loopStart = sample.loopStart;

		//var arrayBuffer = app.cache.findBuffer(sample.path);
		mixSample.signed=app.cache.findSigned(sample.path);
		if (mixSample.loopEnd > mixSample.signed.length) {
			mixSample.loopEnd = Math.floor(mixSample.loopEnd / 2);
			if (mixSample.loopEnd < mixSample.loopStart) {
				mixSample.loopStart = Math.floor(mixSample.loopStart / 2);
			}
		}

		mixSample.isDrum = false;
		//mixSample.dataView = new DataView(arrayBuffer);
		//mixSample.dataViewByteLength = arrayBuffer.byteLength;
		//mixSample.array=arrayBuffer;
		mixSample.volume = sample.volume;
		me.mixSamples[me.mixSamples.length] = mixSample;
		//console.log("addMixInstrument", mixSample);
	};
	this.removeUnusedSamples = function () {
		//console.log("removeUnusedSamples",me.mixSamples.length);
		var done = false;
		while (!done) {
			done = true;
			for (var i = 0; i < me.mixSamples.length; i++) {
				var mixSample = me.mixSamples[i];
				if (mixSample.unused) {
					//console.log("removeUnusedSamples",me.mixSamples.length,mixSample);
					me.mixSamples.splice(i, 1);
					done = false;
					break;
				}
			}
		}
	};
	this.addNextSamples = function () {
		//console.log(me.mix16Counter,"addNextSamples");
		for (var r = 0; r < me.mixSongPosition.riffIds.length; r++) {
			var songRiff = toolbox.findRiffById(me.mixSongPosition.riffIds[r], me.mixSong);
			var chord=null;
			if(songRiff.beat){
				var chord = songRiff.beat[me.mix16Counter];
			}
			if (chord != null) {
				for (var i = 0; i < chord.length; i++) {
					var songRiffBeatPoint = chord[i];
					//console.log(me.mix16Counter,songRiffBeatPoint);
					me.addMixDrum(toolbox.findSampleById(songRiffBeatPoint.sampleId, me.mixSong));
				}
			}
			for (var t = 0; t < songRiff.tunes.length; t++) {
				var songRiffTune = songRiff.tunes[t];
				var chord = songRiffTune.steps[me.mix16Counter];
				if (chord != null) {
					for (var i = 0; i < chord.length; i++) {
						var songRiffTunePoint = chord[i];
						var songSample = toolbox.findSampleById(songRiffTune.sampleId, me.mixSong);
						//console.log(songRiffTune.sampleId,songSample,songRiffTunePoint);

						this.addMixInstrument(songSample, songRiffTunePoint);
					}
				}
			}
		}
	};
	this.mixReset = function (song,sampleRate,x,y) {
		
		if(app.lockedSlot==null){
			var xx=0;
			var yy=0;
			if(x>0){
				xx=x;
			}
			if(y>0){
				yy=y;
			}
			me.mixSongPosition = toolbox.findOrCreatePositionXY(song, xx, yy);
		}else{
			me.mixSongPosition = app.lockedSlot;
		}
		me.mix16Counter = 0;
		me.mixBarCounter = 0;
		me.mixSong = song;
me.mixSampleRate=sampleRate;
		me.mixSamples = [];
		me.buffer16size = //me.pcm.sampleRate 
			me.mixSampleRate* (60.0 / 4.0) / me.mixSong.tempo;
		/*console.log("mixReset", me.mixSongPosition.left + ":" + me.mixSongPosition.top);
		for (var i = 0; i < 99; i++) {
		me.mixSongPosition = toolbox.nextPosition(song, me.mixSongPosition.left, me.mixSongPosition.top);
		console.log(i + " - " + me.mixSongPosition.left + ":" + me.mixSongPosition.top);
		}*/
		me.addNextSamples();
		console.log("reset",new Date(),me.mixSongPosition,app.lockedSlot);
	};
	this.mixNext = function (size) {
		var signed = [];

		//console.log("mixBarSize",mixBarSize);
		for (var i = 0; i < size; i++) {
			//
			var volume = me.calculateMixBar();
			//console.log("volume",volume);
			//signed[i] = volume;
			signed.push(volume);
			me.mixBarCounter++;
			if (me.mixBarCounter >= me.buffer16size) {
				me.mixBarCounter = 0;
				
				me.removeUnusedSamples();
				me.mix16Counter++;
				//console.log("tick",me.mix16th);
				var jumpNextPosition=false;
				if(me.mixSongPosition.length>0){
					if (me.mix16Counter >= me.mixSongPosition.length) {
						jumpNextPosition=true;
					}
				}
				else{
					if (me.mix16Counter >= me.mixSong.meter) {
						jumpNextPosition=true;
					}
				}
				//if (me.mix16Counter >= me.mixSong.meter) {
				if (jumpNextPosition) {
					me.mix16Counter = 0;
					if(app.lockedSlot!=null){
						console.log("rewind",new Date(),me.mixSongPosition,app.lockedSlot);
						}
					else{						
						me.mixSongPosition = toolbox.nextPosition(me.mixSong, me.mixSongPosition.left, me.mixSongPosition.top);
						console.log("next",new Date(),me.mixSongPosition);
					}
					//console.log("next",new Date(),me.mixSongPosition);
				}
				me.addNextSamples();
			}
		}
		//console.log("mixBarSize",mixBarSize);
		return signed;
	};
	this.mixWholeSong = function (song) {
		console.log("mixWholeSong");
		console.log(song);
		toolbox.adjustSamples(song);
		var positionCount = 0;
		var maxLeft = -1;
		var maxTop = -1;
		var count16 = 0;
		for (var n = 0; n < song.positions.length; n++) {
			if (song.positions[n].left > maxLeft) {
				maxLeft = song.positions[n].left;
			}
			if (song.positions[n].top > maxTop) {
				maxTop = song.positions[n].top;
			}
		}
		for (var y = 0; y <= maxTop; y++) {
			for (var x = 0; x <= maxLeft; x++) {
				for (var n = 0; n < song.positions.length; n++) {
					if (song.positions[n].left == x && song.positions[n].top == y) {
						count16 = count16 + song.meter;
					}
				}
			}
		}
		var sixteenth = me.pcm.sampleRate * (60.0 / 4.0) / song.tempo;
		var bufferLen = sixteenth * count16;
		/*console.log("bufferLen " + bufferLen);
		console.log("sixteenth " + sixteenth);
		console.log("song.tempo " + song.tempo);
		console.log("song.meter " + song.meter);
		console.log("maxLeft " + maxLeft);
		console.log("maxTop " + maxTop);
		console.log("count16 " + count16);
		console.log("me.pcm.sampleRate " + me.pcm.sampleRate);*/
		//bufferLen=100;
		var signed = [];
		for (var n = 0; n < bufferLen; n++) {
			signed[n] = 0;
		}
		var start16 = 0;
		for (var y = 0; y <= maxTop; y++) {
			for (var x = 0; x <= maxLeft; x++) {
				for (var n = 0; n < song.positions.length; n++) {
					var songPosition = song.positions[n];
					if (songPosition.left == x && songPosition.top == y) {
						me.addPositionToBuffer(song, songPosition, start16, signed, sixteenth);
						start16 = start16 + song.meter;
						break;
					}
				}
			}
		}
		return signed;
	};
	this.addPositionToBuffer = function (song, songPosition, start16, signed, sixteenth) {
		console.log("mixing "+start16 + ": " + songPosition.left + "x" + songPosition.top);
		//app.promptWarning("Mixing "+songPosition.left + "x" + songPosition.top);
		for (var i = 0; i < songPosition.riffIds.length; i++) {
			var songRiff = toolbox.findRiffById(songPosition.riffIds[i], song);
			for (var b = 0; b < songRiff.beat.length; b++) {
				var chord = songRiff.beat[b];
				for (var c = 0; c < chord.length; c++) {
					var songRiffBeatPoint = chord[c];
					var drum = toolbox.findSampleById(songRiffBeatPoint.sampleId, song);
					me.addDrumSample(sixteenth, start16 + b, signed, drum);
				}
			}
			for (var t = 0; t < songRiff.tunes.length; t++) {
				var songRiffTune = songRiff.tunes[t];
				var instrument = toolbox.findSampleById(songRiffTune.sampleId, song);
				for (var s = 0; s < songRiffTune.steps.length; s++) {
					var step = songRiffTune.steps[s];
					for (var p = 0; p < step.length; p++) {
						var songRiffTunePoint = step[p];
						me.addPitchSample(sixteenth, start16 + s, signed, instrument, songRiffTunePoint.pitch, songRiffTunePoint.length, songRiffTunePoint.shift);
					}
				}
			}
		}
	};
	this.mixPositionW = function (position, song, afterMix) {
		toolbox.adjustSamples(song);
		var cuSong = song;
		var cuPosition = position;
		app.cache.all(song //
		, function (position, song) {
			console.log("cached ok");
			// me.doTest(cuPosition, cuSong);
			var sixteenth = me.pcm.sampleRate * (60.0 / 4.0) / cuSong.tempo;
			var bufferLen = sixteenth * cuSong.meter;
			/*console.log("bufferLen " + bufferLen);
			console.log("sixteenth " + sixteenth);
			console.log("cuSong.tempo " + cuSong.tempo);
			console.log("cuSong.meter " + cuSong.meter);
			console.log("me.pcm.sampleRate " + me.pcm.sampleRate);*/
			var signed = [];
			for (var n = 0; n < bufferLen; n++) {
				signed[n] = 0;
			}

			for (var i = 0; i < cuPosition.riffIds.length; i++) {
				var cuRiff = toolbox.findRiffById(cuPosition.riffIds[i], cuSong);
				//console.log(cuRiff);
				for (var b = 0; b < cuRiff.beat.length; b++) {
					var chord = cuRiff.beat[b];
					for (var c = 0; c < chord.length; c++) {
						var songRiffBeatPoint = chord[c];
						var drum = toolbox.findSampleById(songRiffBeatPoint.sampleId, cuSong);
						me.addDrumSample(sixteenth, b, signed, drum);
					}
				}
				for (var t = 0; t < cuRiff.tunes.length; t++) {
					var songRiffTune = cuRiff.tunes[t];
					var instrument = toolbox.findSampleById(songRiffTune.sampleId, cuSong);
					for (var s = 0; s < songRiffTune.steps.length; s++) {
						var step = songRiffTune.steps[s];
						for (var p = 0; p < step.length; p++) {
							var songRiffTunePoint = step[p];
							me.addPitchSample(sixteenth, s, signed, instrument, songRiffTunePoint.pitch, songRiffTunePoint.length, songRiffTunePoint.shift);
						}
					}
				}
			}
			afterMix(signed);
		} //
		, function () {
			console.log("can't cache");
			alert("ops");
		} //
		);
	};
	this.mixPositionN = function (position, song, afterMix) {
		
	
		toolbox.adjustSamples(song);
		var cuSong = new Song();
		cuSong.tempo=song.tempo;
		cuSong.meter=song.meter;
		cuSong.riffs=song.riffs;
		cuSong.samples=song.samples;
		var cuPosition = new SongPosition();
		cuSong.positions[0]=cuPosition;
		cuPosition.riffIds=position.riffIds;
		cuPosition.left=0;
		cuPosition.top=0;
		//var cuPosition = position;
		app.cache.all(cuSong //
		, function (){//cuPosition, cuSong) {
			console.log("cached ok",cuPosition, cuSong);
			var sixteenth = me.pcm.sampleRate * (60.0 / 4.0) / cuSong.tempo;
			var bufferLen = sixteenth * cuSong.meter;
			//
			app.mixer.mixReset(cuSong);
			var signed = app.mixer.mixNext(bufferLen);
			console.log("stream rendered");
			/*var signed = [];
			for (var n = 0; n < bufferLen; n++) {
				signed[n] = 0;
			}
			for (var i = 0; i < cuPosition.riffIds.length; i++) {
				var cuRiff = toolbox.findRiffById(cuPosition.riffIds[i], cuSong);
				for (var b = 0; b < cuRiff.beat.length; b++) {
					var chord = cuRiff.beat[b];
					for (var c = 0; c < chord.length; c++) {
						var songRiffBeatPoint = chord[c];
						var drum = toolbox.findSampleById(songRiffBeatPoint.sampleId, cuSong);
						me.addDrumSample(sixteenth, b, signed, drum);
					}
				}
				for (var t = 0; t < cuRiff.tunes.length; t++) {
					var songRiffTune = cuRiff.tunes[t];
					var instrument = toolbox.findSampleById(songRiffTune.sampleId, cuSong);
					for (var s = 0; s < songRiffTune.steps.length; s++) {
						var step = songRiffTune.steps[s];
						for (var p = 0; p < step.length; p++) {
							var songRiffTunePoint = step[p];
							me.addPitchSample(sixteenth, s, signed, instrument, songRiffTunePoint.pitch, songRiffTunePoint.length, songRiffTunePoint.shift);
						}
					}
				}
			}*/
			afterMix(signed);
		} //
		, function () {
			console.log("can't cache");
			alert("ops");
		} //
		);
	};
	this.calculateFrequency = function (pitch, base, correction) {
		var shifted = pitch + base + correction / 100.0;
		// var n = (shifted) % 12;
		// var o = Math.floor(shifted / 12);
		// var f = this.octave0[n] * Math.pow(2, o - 12);
		var f = this.frequencies[Math.floor(shifted)] * 0.25;
		return f;
	};
	this.addPitchSample = function (sixteenth, start, signedArray, sample, startPitch, length, shift) {
		// var sampleNote = (sample.basePitch) % 12;
		// var sampleOctave = Math.floor(sample.basePitch / 12);
		// var sampleFrequency = this.octave0[sampleNote] * Math.pow(2,
		// sampleOctave);
		var sampleFrequency = 0.25 * this.frequencies[Math.floor(sample.basePitch)];
		var startFrequency = this.calculateFrequency(startPitch, sample.basePitch, sample.correction);
		var endFrequency = this.calculateFrequency(startPitch + shift, sample.basePitch, sample.correction);
		var arrayBuffer = app.cache.findBuffer(sample.path);
		var ringLength = sixteenth * length;
		var stepDelta = (startFrequency / sampleFrequency) * (sample.sampleRate / me.pcm.sampleRate);
		var endDelta = (endFrequency / sampleFrequency) * (sample.sampleRate / me.pcm.sampleRate);
		var stepShift = (endDelta - stepDelta) / ringLength;
		var dataView = new DataView(arrayBuffer);
		if (sample.loopEnd > arrayBuffer.byteLength) {
			sample.loopEnd = Math.floor(sample.loopEnd / 2);
			if (sample.loopEnd < sample.loopStart) {
				sample.loopStart = Math.floor(sample.loopStart / 2);
			}
		}
		var currentIndex = 0.0;
		var startIndex = Math.round(sixteenth * start);
		// console.log("startIndex: " + startIndex + ", stepDelta: " + stepDelta+",
		// endDelta: "+endDelta+", shift: "+shift+", stepShift: "+stepShift);
		for (var i = startIndex; i < startIndex + ringLength; i++) {
			if (i >= signedArray.length) {
				break;
			}
			/*if (Math.round(currentIndex) >= dataView.byteLength) {
			console.log("ops " + Math.round(currentIndex) + ">=" + dataView.byteLength);
			console.log("ringLength " + ringLength);
			console.log("sample.loopStart " + sample.loopStart);
			console.log("sample.loopEnd " + sample.loopEnd);
			console.log("sample.path " + sample.path);
			}*/
			var ri = Math.round(currentIndex);
			if (ri < arrayBuffer.byteLength) {
				signedArray[i] = signedArray[i] + sample.volume * dataView.getInt8(ri);
			}
			currentIndex = currentIndex + stepDelta;
			stepDelta = stepDelta + stepShift;
			if (sample.loopEnd > 0) {
				if (Math.round(currentIndex) >= sample.loopEnd) {
					currentIndex = currentIndex - (sample.loopEnd - sample.loopStart);
					// console.log("currentIndex "+currentIndex);
				}
			}
		}
	};
	this.addDrumSample = function (sixteenth, start, signedArray, sample) {
		//var tt=0;
		//console.log("addDrumSample",sample);
		var sampleFrequency = this.frequencies[Math.floor(sample.basePitch)];
		var startFrequency = this.calculateFrequency(sample.basePitch, sample.basePitch, sample.correction);
		var arrayBuffer = app.cache.findBuffer(sample.path);
		var ringLength = sixteenth * 8000;
		var stepDelta = (startFrequency / sampleFrequency) * (sample.sampleRate / me.pcm.sampleRate);
		var dataView = new DataView(arrayBuffer);
		var currentIndex = 0.0;
		var startIndex = Math.round(sixteenth * start);
		var roundIndex = 0;
		/*console.log("stepDelta "+stepDelta);
		console.log("sampleFrequency "+sampleFrequency);
		console.log("startFrequency "+startFrequency);
		console.log("sample.sampleRate "+sample.sampleRate);
		console.log("me.pcm.sampleRate "+me.pcm.sampleRate);*/
		for (var i = startIndex; i < startIndex + ringLength; i++) {
			if (i >= signedArray.length) {
				break;
			}
			roundIndex = Math.round(currentIndex);
			if (roundIndex >= arrayBuffer.byteLength) {
				break;
			}
			signedArray[i] = signedArray[i] + sample.volume * dataView.getInt8(roundIndex);
			//tt++;if(tt<100)console.log(i+": "+roundIndex+": "+stepDelta+": "+currentIndex+": "+sample.volume +" / "+ dataView.getInt8(roundIndex));
			currentIndex = currentIndex + stepDelta;
		}
	};
	/*this.doTest = function (position, song) {
	var sixteenth = me.pcm.sampleRate * (60.0 / 4.0) / song.tempo;
	var bufferLen = sixteenth * song.meter;
	console.log("bufferLen: " + bufferLen);
	var signed = [];
	for (var i = 0; i < bufferLen; i++) {
	signed[i] = 0;
	}
	var sample1 = new SongSample();
	var sample2 = new SongSample();
	var drum1 = new SongSample();
	toolbox
	.adjustSample(
	"http://javafx.me/sf/instruments/000/SynthGMS_000/000_000-050_60_-7500_10655-17227_44100",
	sample1);
	toolbox
	.adjustSample(
	"http://javafx.me/sf/instruments/000/SynthGMS_000/001_051-057_60_-8100_17637-22127_44100",
	sample2);
	toolbox
	.adjustSample(
	"http://javafx.me/sf/drums/000/SynthGMS_128/013_038-038_60_-5600_7-3873_44100",
	drum1);
	// toolbox.adjustSample("http://javafx.me/sf/instruments/000/SynthGMS_000/003_067-076_60_-8300_15428-25212_44100",sample2);
	me.addPitchSample(sixteenth, 0, signed, sample1, 60, 4, -5);
	me.addPitchSample(sixteenth, 4, signed, sample1, 55, 4, 5);
	me.addPitchSample(sixteenth, 8, signed, sample1, 60, 4, -5);
	me.addPitchSample(sixteenth, 12, signed, sample1, 55, 4, 5);
	me.addPitchSample(sixteenth, 16, signed, sample1, 60, 4, -5);
	me.addPitchSample(sixteenth, 20, signed, sample1, 55, 4, 5);
	me.addPitchSample(sixteenth, 24, signed, sample1, 60, 2, 0);
	me.addPitchSample(sixteenth, 26, signed, sample1, 55, 2, 0);
	me.addPitchSample(sixteenth, 28, signed, sample1, 57, 2, 0);
	me.addPitchSample(sixteenth, 30, signed, sample1, 59, 2, 0);
	me.addDrumSample(sixteenth, 0, signed, drum1);
	me.addDrumSample(sixteenth, 4, signed, drum1);
	me.addDrumSample(sixteenth, 8, signed, drum1);
	me.addDrumSample(sixteenth, 10, signed, drum1);
	me.addDrumSample(sixteenth, 12, signed, drum1);
	// me.addSample(sixteenth,30, signed, sample1,60-24,4);
	// me.addSample(sixteenth,2, signed, sample2,40,0);
	var data = me.unsigned(signed);
	var s = me.pcm.make(data);
	// console.log(s);
	// console.log("try open");
	window.open(s);
	// console.log("done test");
	};*/
	me.unsigned = function (signed) {
		var sample = [];
		var b = 0;
		var le = signed.length;
		for (var i = 0; i < le; i++) {
			b = signed[i];
			if (b > 127) {
				b = 127;
			}
			if (b < -128) {
				b = -128;
			}
			sample[i] = b + 128;
		}
		return sample;
	};
	return this;
}
function PanelBeat() {
	var me = this;
	this.visibled = false;
	this.x = 0;
	this.y = 0;
	this.w = 150;
	this.h = 250;
	this.deltaX = 0;
	this.deltaY = 0;
	this.yBound = 200;
	//this.lastTouchX = -1;
	//this.lastTouchY = -1;
	this.render = function (context) {
		context.save();
		context.beginPath();
		context.moveTo(0, 0);
		context.lineTo(app.renderer.w, 0);
		context.lineTo(app.renderer.w, app.renderer.h);
		context.lineTo(0, app.renderer.h);
		context.clip();
		var cellSize = app.renderer.panelPosition.cellSize();
		if (app.song.zoomPosition > 0) {
			var fs = 0.45;
			if (app.song.zoomPosition < 2) {
				fs = 0.35;
			}
			context.globalAlpha = 0.15;
			me.drawCellLines(context, cellSize);
			context.globalAlpha = 0.5;
			me.drawNames(fs, cellSize);
		}
		context.globalAlpha = 0.25;
		me.drawBeatBars(context, cellSize);

		context.lineWidth = cellSize;
		context.strokeStyle = "#ffffff";
		var songPosition=toolbox.findPosition(app.song.selectedPositionId,app.song);
		//console.log("songPosition",songPosition,app.song.selectedPositionId);
		//if(songPosition!=null){
			for (var i = 0; i < songPosition.riffIds.length; i++) {
				var riffId = songPosition.riffIds[i];
				var songRiff = toolbox.findRiffById(riffId, app.song);
				if(songRiff!=null){
					if (songRiff.id == app.song.selectedRiffId) {
						context.globalAlpha = 0.9;
					} else {
						context.globalAlpha = 0.5;
					}
					if(songRiff.beat){
					for (var step = 0; step < songRiff.beat.length; step++) {
						var chord = songRiff.beat[step];
						if(!chord){
							chord=[];
							songRiff.beat[step]=chord;
						}
						for (var c = 0; c < chord.length; c++) {
							var songRiffBeatPoint = chord[c];
							var yy = this.findDrumOrder(songRiffBeatPoint.sampleId);
							context.beginPath();
							context.moveTo(me.x + step * cellSize + cellSize / 2, me.y + yy * cellSize + cellSize / 2);
							context.lineTo(me.x + step * cellSize + cellSize / 2, me.y + yy * cellSize + 1 + cellSize / 2);
							context.stroke();
							context.closePath();
						}
					}}
				}
			}
		//}
		context.globalAlpha = 1;
		
		/*if (me.lastTouchX > -1) {
		context.beginPath();
		context.moveTo(me.x + me.lastTouchX * cellSize + cellSize / 2, me.y + me.lastTouchY * cellSize + cellSize / 2);
		context.lineTo(me.x + me.lastTouchX * cellSize + cellSize / 2, me.y + me.lastTouchY * cellSize + 1 + cellSize / 2);
		context.stroke();
		context.closePath();
		}*/
		if (app.renderSlotStep) {
			app.renderer.context.fillStyle = "rgba(255,255,255,0.5)";
			app.renderer.context.fillRect(me.x+app.mixer.mix16Counter*cellSize-cellSize*2,me.y, cellSize*4, window.innerHeight);
		}
		context.restore();
	};
	this.findDrumOrder = function (id) {
		var cntr = 0;
		for (var k = 0; k < app.song.samples.length; k++) {
			var songSample = app.song.samples[k];
			if (songSample.id == id) {
				return cntr;
			}
			if (songSample.isDrum) {
				cntr++;
			}
		}
		return -1;
	};
	me.drawNames = function (fs, cellSize) {
		var cntr = 0;
		for (var i = 0; i < app.song.samples.length; i++) {
			var songSample = app.song.samples[i];
			if (songSample.isDrum) {
				var name = toolbox.drumNames[songSample.midi];
				//name=name+"/"+songSample.path;
				app.renderer.string(name, fs, 4, me.y + cntr * cellSize);
				cntr++;
			}
		}
	};
	me.findDrumByY = function (yy) {
		var cntr = 0;
		for (var i = 0; i < app.song.samples.length; i++) {
			var songSample = app.song.samples[i];
			if (songSample.isDrum) {
				if (yy == cntr) {
					return songSample;
				}
				//var name = toolbox.drumNames[songSample.midi];
				//name=name+"/"+songSample.path;
				//app.renderer.string(name, fs, 4, me.y + cntr * cellSize);
				cntr++;
			}
		}
		return null;
	};
	me.drawCellLines = function (context, cellSize) {
		var cntr = 0;
		context.fillStyle = "#ffffff";
		for (var i = 0; i < app.song.samples.length; i++) {
			var songSample = app.song.samples[i];
			if (songSample.isDrum) {
				if (cntr > 0) {
					context.fillRect(me.x, me.y + cntr * cellSize, app.song.meter * cellSize, 1);
				}
				cntr++;
			}
		}
		for (var i = 1; i < app.song.meter; i++) {
			context.fillRect(me.x + i * cellSize, me.y, 1, cntr * cellSize);
		}
	};
	me.drawBeatBars = function (context, cellSize) {
		var cntr = 0;
		for (var i = 0; i < app.song.samples.length; i++) {
			var songSample = app.song.samples[i];
			if (songSample.isDrum) {
				cntr++;
			}
		}
		var partSize=8;
		if(app.song.meter % 6 == 0){
			partSize=6;
		}
		for (var i = partSize; i < app.song.meter; i = i + partSize) {
			context.fillRect(me.x + i * cellSize, me.y, 1, cntr * cellSize);
		}
	};
	me.catchMove = function (x, y) {
		if (x > 0 && x < app.renderer.w && y > 0 && y < me.yBound) {
			me.deltaX = me.x - x;
			me.deltaY = me.y - y;
			return true;
		} else {
			return false;
		}
	};
	me.moveTo = function (x, y) {
		me.x = x + me.deltaX;
		me.y = y + me.deltaY;
		me.syncX();
	};
	me.endMove = function (x, y) {
		me.x = x + me.deltaX;
		me.y = y + me.deltaY;
		me.adjustContent();
	};
	me.tapBeat = function (xx, yy) {
		var songRiff = toolbox.findRiffById(app.song.selectedRiffId, app.song);
		var songSample = me.findDrumByY(yy);
		if (toolbox.existsBeatPointAtRiff(xx, songSample.id, songRiff)) {
			toolbox.removeBeatPointFromRiff(xx, songSample.id, songRiff);
		} else {
			toolbox.setBeatPointToRiff(xx, songSample.id, songRiff);
		}
	};
	me.afterTap = function (x, y) {
		//if (app.song.zoomPosition > 0) {
			var cellSize = app.renderer.panelPosition.cellSize();
			var xx = Math.floor((x - me.x) / cellSize);
			var yy = Math.floor((y - me.y) / cellSize);
			var cntr = 0;
			for (var i = 0; i < app.song.samples.length; i++) {
				var songSample = app.song.samples[i];
				if (songSample.isDrum) {
					cntr++;
				}
			}
			if (xx > -1 && yy > -1 && yy < cntr) {
				var songPosition=toolbox.findPosition(app.song.selectedPositionId,app.song);
				var rid=app.selectRiffIfNotSelected(songPosition);
				if (rid == undefined) {
					//app.promptWarning(lang.noSelectedRiff());
					//return;
					var songRiff = new SongRiff();
					app.song.riffs[app.song.riffs.length] = songRiff;
					songPosition.riffIds[songPosition.riffIds.length] = songRiff.id;
					app.song.selectedRiffId=songRiff.id;
					app.renderer.menuRiffs.refresh();
					app.renderer.menuSamples.refresh();
				}
				/*var found = false;				
				for (var i = 0; i < songPosition.riffIds.length; i++) {
					if (songPosition.riffIds[i] == app.song.selectedRiffId) {
						found = true;
						break;
					}
				}
				if (!found) {
					app.promptWarning(lang.noSelectedRiffInSlot());
					return;
				}*/
				me.tapBeat(xx, yy);
			}
		/*}
		else{
			app.promptWarning(lang.increaseZoom());
		}*/
	}
	this.adjustSize = function () {
		me.yBound = app.renderer.panelPosition.horizontal.y + tapSize / 2;
		var cellSize = app.renderer.panelPosition.cellSize();
		me.w = app.song.meter * cellSize;
		var cntr = 0;
		if(app.song.samples){
			for (var i = 0; i < app.song.samples.length; i++) {
				var songSample = app.song.samples[i];
				if (songSample.isDrum) {
					cntr++;
				}
			}
		}
		me.h = cntr * cellSize;
	};
	this.adjustContent = function () {
		me.adjustSize();
		if (me.x < app.renderer.w - me.w) {
			me.x = app.renderer.w - me.w;
		}
		if (me.y < app.renderer.h - me.h) {
			me.y = app.renderer.h - me.h;
		}
		if (me.x > 0) {
			me.x = 0;
		}
		if (me.y > 0) {
			me.y = 0;
		}
		me.syncX();
	}
	this.syncX = function () {
		app.renderer.panelPosition.panelMelody.x = me.x;
	};
	return this;
}
function PanelKeys() {
	var me = this;
	this.visibled = false;
	this.yBound = 200;
	this.deltaX = 0;
	this.deltaY = 0;
	this.x = 0;
	this.y = 0;
	this.w = tapSize * 128;
	this.currentKey=-1;
	var audioContext = null;
	var audioBufferSourceNode=null;
	this.render = function (context) {
		context.save();
		context.beginPath();
		context.moveTo(0, me.yBound);
		context.lineTo(app.renderer.w, me.yBound);
		context.lineTo(app.renderer.w, app.renderer.h);
		context.lineTo(0, app.renderer.h);
		context.clip();
		context.fillStyle = "rgba(32,32,32,0.75)";
		context.fillRect(0, me.yBound, app.renderer.w, app.renderer.h - me.yBound);

		for (var i = 0; i < 10; i++) {
			context.fillStyle = "rgba(255,255,255,0.75)";
			for (var n = 0; n < 7; n++) {
				context.fillRect(me.x + n * tapSize + i * 7 * tapSize, me.yBound, tapSize - 1, tapSize * 2.5);
			}
			context.fillStyle = "rgb(0,0,0)";
			context.fillRect(me.x + 0.5 * tapSize + 0 * tapSize + i * 7 * tapSize, me.yBound, tapSize - 1, tapSize * 1.5);
			context.fillRect(me.x + 0.5 * tapSize + 1 * tapSize + i * 7 * tapSize, me.yBound, tapSize - 1, tapSize * 1.5);
			context.fillRect(me.x + 0.5 * tapSize + 3 * tapSize + i * 7 * tapSize, me.yBound, tapSize - 1, tapSize * 1.5);
			context.fillRect(me.x + 0.5 * tapSize + 4 * tapSize + i * 7 * tapSize, me.yBound, tapSize - 1, tapSize * 1.5);
			context.fillRect(me.x + 0.5 * tapSize + 5 * tapSize + i * 7 * tapSize, me.yBound, tapSize - 1, tapSize * 1.5);
			app.renderer.string("" + i, 0.35, me.x + i * 7 * tapSize + 4, me.yBound + tapSize * 2.6);
		}
		context.restore();
	};
	me.findKeyNum = function (x, y) {
		var r = -1;
		var octava=Math.floor(x/(7*tapSize));
		//console.log(x, y);
		if (y > tapSize * 1.5 && y < tapSize * 2.5) {
			var white=Math.floor((x-octava*7*tapSize)/tapSize);
			//console.log("white",octava,white);
			switch(white) {
					case 0:
						r=octava*12+0;
						break;
					case 1:
						r=octava*12+2;
						break;
					case 2:
						r=octava*12+4;
						break;
					case 3:
						r=octava*12+5;
						break;
					case 4:
						r=octava*12+7;
						break;
					case 5:
						r=octava*12+9;
						break;
					case 6:
						r=octava*12+11;
						break;
					default:
						//
				}
		}else{
			if (y > 0 && y < tapSize * 1.5) {
				var black=Math.floor((x-octava*7*tapSize+0.5*tapSize)/tapSize);
				//console.log("black",octava,black);
				switch(black) {
					case 1:
						//console.log("black 1",octava,black);
						r=octava*12+1;
						break;
					case 2:
						r=octava*12+3;
						break;
					case 4:
						r=octava*12+6;
						break;
					case 5:
						r=octava*12+8;
						break;
					case 6:
						r=octava*12+10;
						break;
					default:
						//
				}
			}
		}
		return r;
	};
	me.minNote=function(b,c){
		var sampleFrequency = app.mixer.frequencies[Math.floor(b)];
		var startFrequency = app.mixer.frequencies[Math.floor(k + b + c / 100.0)];
		var rate=(startFrequency/sampleFrequency)* songSample.sampleRate ;
		sampleFrequency=3000*sampleFrequency/songSample.sampleRate;
	};
	var probe=0;
	me.startKey=function(k){
		//console.log("startKey",k,new Date().getTime());
		probe=new Date().getTime();
		me.currentKey=k;
		var songSample=toolbox.findSampleById(app.song.selectedSampleId,app.song);
		
		if(songSample==null){
			app.promptWarning("No selected instrument");
			me.currentKey=-1;
		}else{
			//me.minNote(songSample.basePitch,songSample.correction);
			//var maxRatio=192000/songSample.sampleRate;
			//var minRatio=3000/songSample.sampleRate;
			//console.log(minRatio,maxRatio);
			var signed=app.cache.findSigned(songSample.path,app.song);
			if(audioContext==null){
				window.AudioContext = window.AudioContext || window.webkitAudioContext;
				audioContext = new AudioContext();
				console.log("new",audioContext);
				}
			var sampleFrequency = app.mixer.frequencies[Math.floor(songSample.basePitch)];
			//var startFrequency = app.mixer.calculateFrequency(k, songSample.basePitch, songSample.correction);
			var startFrequency = app.mixer.frequencies[Math.floor(k + songSample.basePitch + songSample.correction / 100.0)];
			var rate=(startFrequency/sampleFrequency)* songSample.sampleRate ;
			var step=1;
			//console.log(rate);
			if(rate>192000){
				rate=rate/2;
				step=step*2;
			}
			if(rate>192000){
				rate=rate/2;
				step=step*2;
			}
			if(rate>192000){
				rate=rate/2;
				step=step*2;
			}
			if(rate>192000){
				rate=rate/2;
				step=step*2;
			}
			
			if(rate<3000){
				rate=rate*2;
				step=step/2;
			}
			if(rate<3000){
				rate=rate*2;
				step=step/2;
			}
			if(rate<3000){
				rate=rate*2;
				step=step/2;
			}
			if(rate<3000){
				rate=rate*2;
				step=step/2;
			}
			//console.log("now",rate);
			if(signed==undefined){
				app.promptWarning("Load instrument");
				app.cache.binaryLoader.load(songSample.path//
					, function(){
						//app.cache.arrayBuffers[app.cache.arrayBuffers.length] = app.cache.binaryLoader.arrayBuffer;
						/*var dataView = new DataView(app.cache.binaryLoader.arrayBuffer);
						var f32=new Float32Array(dataView.byteLength);
						for (i = 0; i < dataView.byteLength ; i++) {
							f32[i] = dataView.getInt8(i) / 128.0;
						}
						app.cache.float32Arrays[app.cache.float32Arrays.length]=f32;
						*/
						var signedView=new DataView(app.cache.binaryLoader.arrayBuffer);
						var signed=[];
						for (i = 0; i < signedView.byteLength ; i++) {
							signed.push(signedView.getInt8(i));
						}
						app.cache.signeds[app.cache.signeds.length]=signed;
						app.cache.paths[app.cache.paths.length] = songSample.path;						
					}//
					, function(){
						//
					});
				me.currentKey=-1;
			}else{
				try{
					//console.log("audioBuffer",new Date().getTime());
					var audioBuffer = audioContext.createBuffer(1, signed.length, rate);//[3000, 192000]
					var float32Array = audioBuffer.getChannelData(0);
					var s=0;
					//console.log("channel",new Date().getTime());
					for (i = 0; i < float32Array.length; i++) {		
						if(s<signed.length){
							float32Array[i] = 0.5*songSample.volume*signed[Math.floor(s)] / 256.0;
							s=s+step;
						}else{
							break;
						}
					}
					
					//console.log("filled",new Date().getTime());
					audioBufferSourceNode = audioContext.createBufferSource();
					audioBufferSourceNode.buffer = audioBuffer; 
					//console.log("songSample",songSample,float32Array.length);
					if(songSample.loopStart>10 && songSample.loopEnd<=float32Array.length){
						var fre=float32Array.length/rate;
						var st=fre*songSample.loopStart / float32Array.length;
						var en=fre*songSample.loopEnd / float32Array.length;
						//console.log(fre,rate,st,en,en-st);
						audioBufferSourceNode.loop = true;
						audioBufferSourceNode.loopStart = st;
						audioBufferSourceNode.loopEnd = en;
					}
					audioBufferSourceNode.connect(audioContext.destination);
					//console.log("almost",new Date().getTime());
					audioBufferSourceNode.start();
					//console.log("done",new Date().getTime());
					probe=new Date().getTime()-probe;
				}catch(exx){
					//app.promptWarning(""+exx);
					console.log(exx);
				}
			}
		}
	};
	me.stopKey=function(){
		audioBufferSourceNode.stop();
		//app.promptWarning("probe "+probe);
	};
	me.catchMove = function (x, y) {
		if (x > 0 && x < app.renderer.w && y > me.yBound && y < app.renderer.h) {
			me.deltaX = me.x - x;
			me.deltaY = me.y - y;
			var k=me.findKeyNum(x - me.x, y - me.yBound);
			if(k>-1){
				me.startKey(k);
			}
			return true;
		} else {
			return false;
		}
	};
	me.moveTo = function (x, y) {
		me.x = x + me.deltaX;
		me.y = y + me.deltaY;
	};
	me.endMove = function (x, y) {
		if(me.currentKey>-1){
			//console.log("done startKey",me.currentKey);
			me.stopKey();
			me.currentKey=-1;
		}
		me.x = x + me.deltaX;
		me.y = y + me.deltaY;
		me.adjustContent();
	};
	me.afterTap = function (x, y) {
		//
	};
	this.adjustSize = function () {
		me.yBound = app.renderer.panelPosition.keysBorder.y + tapSize / 2;
		me.w = tapSize * 70;
	};
	this.adjustContent = function () {
		me.adjustSize();
		me.y = 0;
		if (me.x < app.renderer.w - me.w) {
			me.x = app.renderer.w - me.w;
		}
		if (me.x > 0) {
			me.x = 0;
		}
		/*if (me.yBound < app.renderer.h - 3.5*tapSize) {
			me.yBound = app.renderer.h - 3.5*tapSize
		}*/
	}
	return this;
}
function PanelMelody() {
	var me = this;
	this.visibled = false;
	this.x = 0;
	this.y = 0;
	this.w = 250;
	this.h = 150;
	this.deltaX = 0;
	this.deltaY = 0;
	this.yBound = 200;
	this.markStep = -1;
	this.markPitch = -1;
	this.render = function (context) {
		context.save();
		context.beginPath();
		context.moveTo(0, me.yBound);
		context.lineTo(app.renderer.w, me.yBound);
		context.lineTo(app.renderer.w, app.renderer.h);
		context.lineTo(0, app.renderer.h);
		context.clip();
		
		
		
		
		
		
		//
		context.fillStyle = "rgba(0,0,0,0.75)";
		context.fillRect(0, me.yBound, app.renderer.w, app.renderer.h);
		//
		var grd=context.createLinearGradient(0, me.yBound, 0, me.yBound+tapSize*3);
			grd.addColorStop(0,"rgba(255,100,0,0.15)");
			grd.addColorStop(1,"rgba(255,100,0,0)");
			context.fillStyle=grd;
		context.fillRect(0, 0, app.renderer.w, me.yBound+tapSize*3);
		
		
		/*context.strokeStyle = "#ffff00";
		context.beginPath();
		context.moveTo(me.x, me.yBound+me.y);
		context.lineTo(me.x + me.w, me.y + me.h+me.yBound);
		context.closePath();
		context.stroke();
		 */

		var cellSize = app.renderer.panelPosition.cellSize();
		if (app.song.zoomPosition > 0) {
			var fs = 0.35;
			if (app.song.zoomPosition < 2) {
				fs = 0.25;
			}
			context.globalAlpha = 0.15;
			me.drawCellLines(context, cellSize);

			me.drawNames(fs, cellSize, context);
		}
		context.globalAlpha = 0.25;
		me.drawMelodyBars(context, cellSize);

		context.lineWidth = cellSize;
		context.strokeStyle = "#ffffff";
		//context.globalAlpha = 0.2;
		for (var i = 0; i < toolbox.findPosition(app.song.selectedPositionId, app.song).riffIds.length; i++) {
			var riffId = toolbox.findPosition(app.song.selectedPositionId, app.song).riffIds[i];
			var songRiff = toolbox.findRiffById(riffId, app.song);
			if(songRiff!=null){
				if (songRiff.id != app.song.selectedRiffId) {
					this.drawMelodyRiff(songRiff, context, cellSize, 0.5);
				}
			}
		}
		//context.globalAlpha = 0.7;
		for (var i = 0; i < toolbox.findPosition(app.song.selectedPositionId, app.song).riffIds.length; i++) {
			var riffId = toolbox.findPosition(app.song.selectedPositionId, app.song).riffIds[i];
			var songRiff = toolbox.findRiffById(riffId, app.song);
			if(songRiff!=null){
				if (songRiff.id == app.song.selectedRiffId) {
					this.drawMelodyRiff(songRiff, context, cellSize, 0.7);
				}
			}
		}
		context.globalAlpha = 1;
		context.restore();
	};
	this.drawMelodyRiff = function (songRiff, context, cellSize, a) {
		var selectedRiff = null;

		if (app.song.selectedRiffId) {
			if (app.song.selectedSampleId) {
				selectedRiff = toolbox.findRiffById(app.song.selectedRiffId, app.song);
			}
		}

		for (var t = 0; t < songRiff.tunes.length; t++) {
			var songRiffTune = songRiff.tunes[t];
			var songSample = toolbox.findSampleById(songRiffTune.sampleId, app.song);
			//context.strokeStyle = songSample.color;
			context.globalAlpha = a;
			
			context.lineWidth = cellSize;
			for (var s = 0; s < songRiffTune.steps.length; s++) {
				var chord = songRiffTune.steps[s];
				if(!chord){
							chord=[];
						}
				for (var c = 0; c < chord.length; c++) {
				
					context.beginPath();
				
					var songRiffTunePoint = chord[c];
					context.strokeStyle = toolbox.calculatePitchColor(songRiffTunePoint.pitch,songSample);

					context.moveTo(me.x + s * cellSize + cellSize / 2 //
					, me.y + me.yBound + (127 - songRiffTunePoint.pitch) * cellSize + cellSize / 2);
					context.lineTo(me.x + s * cellSize + cellSize / 2 + 1 + (songRiffTunePoint.length - 1) * cellSize //
					, me.y + me.yBound + (127 - songRiffTunePoint.pitch) * cellSize + cellSize / 2 - songRiffTunePoint.shift * cellSize);
					
					context.stroke();
					context.closePath();
				}
			}
			//context.stroke();
			//context.closePath();
			context.globalAlpha = 1;
			if (songRiffTune.sampleId == app.song.selectedSampleId) {
				if (selectedRiff != null && toolbox.existsInstrumentIdInRiff(app.song.selectedSampleId, selectedRiff)) {
					//context.globalAlpha = 1;
					
					context.lineWidth = cellSize;
					for (var s = 0; s < songRiffTune.steps.length; s++) {
						var chord = songRiffTune.steps[s];
						if(!chord){
							chord=[];
							songRiffTune.steps[s]=chord;
						}
						for (var c = 0; c < chord.length; c++) {
							context.beginPath();
							var songRiffTunePoint = chord[c];
							context.strokeStyle = toolbox.calculatePitchColor(songRiffTunePoint.pitch,songSample);
							context.moveTo(me.x + s * cellSize + cellSize / 2 //
							, me.y + me.yBound + (127 - songRiffTunePoint.pitch) * cellSize + cellSize / 2);
							context.lineTo(me.x + s * cellSize + cellSize / 2 + 1 //
							, me.y + me.yBound + (127 - songRiffTunePoint.pitch) * cellSize + cellSize / 2);
							context.stroke();
							context.closePath();
						}
					}
					//context.stroke();
					//context.closePath();
				}
			}
			context.lineWidth = 1;
			if (me.markStep > -1) {
				context.strokeStyle = "#ffffff";
				if (app.song.selectedSampleId != null) {
					var songSample = toolbox.findSampleById(app.song.selectedSampleId, app.song);
					context.strokeStyle = songSample.color;
				}
				context.beginPath();
				context.arc(me.x + me.markStep * cellSize + cellSize / 2 //
				, me.y + me.yBound + (127 - me.markPitch) * cellSize + cellSize / 2 //
				, cellSize / 2, 0, Math.PI * 2);
				context.stroke();
				context.closePath();
			}
		}
	}
	me.drawNames = function (fs, cellSize, context) {
		context.fillStyle = "#ffffff";
		context.globalAlpha = 0.25;
		for (var i = 0; i < 128; i = i + 12) {
			context.fillRect(0, me.yBound + 2 + me.y + (127 - i) * cellSize, 2.5 * cellSize, cellSize - 3);
			context.fillRect(0, me.yBound + 2 + me.y + (127 - i - 2) * cellSize, 2.5 * cellSize, cellSize - 3);
			context.fillRect(0, me.yBound + 2 + me.y + (127 - i - 4) * cellSize, 2.5 * cellSize, cellSize - 3);
			context.fillRect(0, me.yBound + 2 + me.y + (127 - i - 5) * cellSize, 2.5 * cellSize, cellSize - 3);
			context.fillRect(0, me.yBound + 2 + me.y + (127 - i - 7) * cellSize, 2.5 * cellSize, cellSize - 3);
			if (i < 120) {
				context.fillRect(0, me.yBound + 2 + me.y + (127 - i - 9) * cellSize, 2.5 * cellSize, cellSize - 3);
				context.fillRect(0, me.yBound + 2 + me.y + (127 - i - 11) * cellSize, 2.5 * cellSize, cellSize - 3);
			}
		}
		context.globalAlpha = 0.5;
		for (var i = 0; i < 128; i = i + 12) {
			app.renderer.string("C", 0.35, 3 * cellSize + 2, me.yBound + 2 + me.y + (127 - i) * cellSize);
			app.renderer.string("D", 0.35, 3 * cellSize + 2, me.yBound + 2 + me.y + (127 - i - 2) * cellSize);
			app.renderer.string("E", 0.35, 3 * cellSize + 2, me.yBound + 2 + me.y + (127 - i - 4) * cellSize);
			app.renderer.string("F", 0.35, 3 * cellSize + 2, me.yBound + 2 + me.y + (127 - i - 5) * cellSize);
			app.renderer.string("G", 0.35, 3 * cellSize + 2, me.yBound + 2 + me.y + (127 - i - 7) * cellSize);
			if (i < 120) {
				app.renderer.string("A", 0.35, 3 * cellSize + 2, me.yBound + 2 + me.y + (127 - i - 9) * cellSize);
				app.renderer.string("B/h", 0.35, 3 * cellSize + 2, me.yBound + 2 + me.y + (127 - i - 11) * cellSize);
			}
		}

		//context.globalAlpha = 0.25;
		for (var i = 0; i < 128; i = i + 12) {
			app.renderer.string("" + (i / 12), 0.35, 4, me.yBound + 2 + me.y + (127 - i) * cellSize);
		}
		/*var cntr = 0;
		for (var i = 0; i < app.song.samples.length; i++) {
		var songSample = app.song.samples[i];
		if (songSample.isDrum) {
		var name = toolbox.drumNames[songSample.midi];
		app.renderer.string(name, fs, 4, me.y + cntr * cellSize);
		cntr++;
		}
		}*/
	};
	me.drawCellLines = function (context, cellSize) {
		context.fillStyle = "#ffffff";
		for (var i = 1; i < 128; i++) {
			context.fillRect(me.x, me.yBound + me.y + i * cellSize, app.song.meter * cellSize, 1);
		}
		for (var i = 1; i < app.song.meter; i++) {
			context.fillRect(me.x + i * cellSize, me.yBound + me.y, 1, 128 * cellSize);
		}
	};
	me.drawMelodyBars = function (context, cellSize) {
		context.globalAlpha = 0.25;
		context.fillStyle = "#ffffff";
		partSize=8;
		if(app.song.meter % 6 == 0){
			partSize=6;
		}
		for (var i = partSize; i < app.song.meter; i = i + partSize) {
			context.fillRect(me.x + i * cellSize, me.yBound + me.y, 1, 128 * cellSize);
			//context.fillRect(me.x + i * cellSize, 0, 10, 1270 );
			//app.renderer.string("" + i, 0.35, me.x + i * cellSize + 4, me.yBound + 4);
		}
		for (var i = 12; i < 128; i = i + 12) {
			context.fillRect(me.x, me.yBound + me.y + (i - 4) * cellSize, app.song.meter * cellSize, 1);
		}
		//context.fillRect(me.x + 8 * cellSize, me.yBound+me.y, 1, 127 * cellSize);
		context.globalAlpha = 0.5;
		for (var i = partSize; i < app.song.meter; i = i + partSize) {
			app.renderer.string("" + i, 0.35, me.x + i * cellSize + 4, me.yBound + 4);
		}
	};
	me.catchMove = function (x, y) {
		if (x > 0 && x < app.renderer.w && y > me.yBound && y < app.renderer.h) {
			me.deltaX = me.x - x;
			me.deltaY = me.y - y;
			return true;
		} else {
			return false;
		}
	};
	me.moveTo = function (x, y) {
		me.x = x + me.deltaX;
		me.y = y + me.deltaY;
		me.syncX();
	};
	me.endMove = function (x, y) {
		me.x = x + me.deltaX;
		me.y = y + me.deltaY;
		me.adjustContent();
	};
	me.tapMelody = function (xx, yy) {
		//console.log(xx + "x" + yy);
		var r = toolbox.findRiffById(app.song.selectedRiffId, app.song);
		var tune = toolbox.getTuneBySampleId(app.song.selectedSampleId, r);
		if (me.markStep > -1) {
			var x1 = me.markStep;
			var x2 = xx;
			var y1 = me.markPitch;
			var y2 = yy;
			if (me.markStep > xx) {
				var x2 = me.markStep;
				var x1 = xx;
				var y2 = me.markPitch;
				var y1 = yy;
			}
			//console.log(x1 + ", " + x2 + ", " + y1 + ", " + y2);
			toolbox.setTunePointToTune(x1, y1, x2 - x1 + 1, y2 - y1, tune);
			me.markStep = -1;
			me.markPitch = -1;
		} else {
			if (toolbox.existsTunePointAtTune(xx, yy, tune)) {
				toolbox.removeTunePointFromTune(r, xx, yy, tune);
			} else {
				me.markStep = xx;
				me.markPitch = yy;
			}
		}
	};
	me.afterTap = function (x, y) {
		//if (app.song.zoomPosition > 0) {
			var cellSize = app.renderer.panelPosition.cellSize();
			var xx = Math.floor((x - me.x) / cellSize);
			var yy = Math.floor((y - me.y - me.yBound) / cellSize);

			if (xx > -1 && yy > -1 && yy < 128) {
				var songPosition = toolbox.findPosition(app.song.selectedPositionId, app.song);
				var rid=app.selectRiffIfNotSelected(songPosition);
				if (rid == undefined) {
					//app.promptWarning(lang.noSelectedRiff());
					//return;
					var songRiff = new SongRiff();
					app.song.riffs[app.song.riffs.length] = songRiff;
					songPosition.riffIds[songPosition.riffIds.length] = songRiff.id;
					app.song.selectedRiffId=songRiff.id;
					app.renderer.menuRiffs.refresh();
					//app.song.showWhat = app.renderer.menuSamples.showWhatRiff;
					app.renderer.menuSamples.refresh();
				}
				//app.selectInstrumentIfNotSelected(app.song.selectedRiffId);
				
				if (app.song.selectedSampleId == null) {
					for(var i=0;i<app.song.samples.length;i++){
						if(!app.song.samples[i].isDrum){
							app.song.selectedSampleId=app.song.samples[i].id;
							app.renderer.menuSamples.refresh();
							break;
						}
					}
					if (app.song.selectedSampleId == undefined) {
						app.promptWarning(lang.noSelectedInstrument());
						return;
					}
				}
				/*
				var found = false;				
				for (var i = 0; i < songPosition.riffIds.length; i++) {
					if (songPosition.riffIds[i] == app.song.selectedRiffId) {
						found = true;
						break;
					}
				}
				if (!found) {
					app.promptWarning(lang.noSelectedRiffInSlot());
					return;
				}
				*/
				me.tapMelody(xx, 127 - yy);
			}
		/*} else {
			app.promptWarning(lang.increaseZoom());
		}*/
	}
	this.adjustSize = function () {
		me.yBound = app.renderer.panelPosition.horizontal.y + tapSize / 2;
		var cellSize = app.renderer.panelPosition.cellSize();
		me.w = app.song.meter * cellSize;
		me.h = 128 * cellSize;
	};
	this.adjustContent = function () {
		me.adjustSize();
		if (me.x < app.renderer.w - me.w) {
			me.x = app.renderer.w - me.w;
		}
		if (me.y < app.renderer.h - me.h) {
			me.y = app.renderer.h - me.h;
		}
		if (me.x > 0) {
			me.x = 0;
		}
		if (me.y > 0) {
			me.y = 0;
		}
		me.syncX();
	}
	this.syncX = function () {
		app.renderer.panelPosition.panelBeat.x = me.x;
	};
	return this;
}
function PanelPosition() {
	var me = this;
	this.visibled = false;
	this.x = 0;
	this.y = 0;
	this.w = 500;
	this.h = 1500;
	this.deltaX = 0;
	this.deltaY = 0;
	this.cellWidth = 2 * tapSize;
	this.cellHeight = 3 * tapSize;
	this.init = function () {
		console.log("SlotPanel.init");
		app.renderer.layers[app.renderer.layers.length] = me;
		me.panelBeat = new PanelBeat();
		app.renderer.layers[app.renderer.layers.length] = me.panelBeat;
		me.panelMelody = new PanelMelody();
		app.renderer.layers[app.renderer.layers.length] = me.panelMelody;
		me.horizontal = new Horizontal();
		me.horizontal.xAnchor = 2 * tapSize;
		app.renderer.layers[app.renderer.layers.length] = me.horizontal;
		me.horizontal.upperPanel = me.panelBeat;
		me.horizontal.lowerPanel = me.panelMelody;
		me.panelKeys = new PanelKeys();
		app.renderer.layers[app.renderer.layers.length] = me.panelKeys;
		me.keysBorder = new Horizontal();
		me.keysBorder.stickDown = true;
		me.keysBorder.xAnchor = 3.5 * tapSize;
		app.renderer.layers[app.renderer.layers.length] = me.keysBorder;
		me.keysBorder.lowerPanel = me.panelKeys;
		me.panelMelody.adjustSize();
		me.panelBeat.adjustSize();
		me.panelKeys.adjustSize();
	};
	this.cellSize = function () {
		var n = tapSize * 0.1;
		if (app.song.zoomPosition == 1) {
			n = tapSize * 0.5;
		}
		if (app.song.zoomPosition == 2) {
			n = tapSize * 0.7;
		}
		if (app.song.zoomPosition == 3) {
			n = tapSize * 1;
		}
		return n;
	};
	this.render = function (context) {
		var position=toolbox.findPosition(app.song.selectedPositionId, app.song);
		if (position != null) {
			/*context.fillStyle = "rgba(255,255,255,0.25)";
			context.textBaseline = "top";
			context.font = 2 * tapSize + "px Arial";
			context.fillText("" + toolbox.findPosition(app.song.selectedPositionId,app.song).left + ":" + toolbox.findPosition(app.song.selectedPositionId,app.song).top, 8, 8);*/
			context.globalAlpha = 0.25;
			var txt="" + position.left + ":" + position.top;
			if(position.length>0){
				txt=txt+" /"+position.length;
			}
			app.renderer.string( txt, 3, 8, 8);
			context.globalAlpha = 1;

		}
		/*
		context.strokeStyle = "#ff00ff";
		context.beginPath();
		context.moveTo(me.x,me.y);
		context.lineTo(me.x+me.w,me.y+me.h);
		context.closePath();
		context.stroke();
		 */
	};
	this.drawSplitter = function (context) {};
	this.drawDrumScore = function (context) {};
	this.drawInstrumentScore = function (context) {};
	me.catchMove = function (x, y) {
		me.deltaX = me.x - x;
		me.deltaY = me.y - y;
		return true;
	};
	me.moveTo = function (x, y) {
		me.x = x + me.deltaX;
		me.y = y + me.deltaY;
	};
	me.endMove = function (x, y) {
		me.x = x + me.deltaX;
		me.y = y + me.deltaY;
		me.adjustContent();
	};
	me.afterTap = function (x, y) {
		me.x = x + me.deltaX;
		me.y = y + me.deltaY;
		var tx = Math.floor((x - me.x) / me.cellWidth);
		var ty = Math.floor((y - me.y) / me.cellHeight);
	}
	this.adjustContent = function () {
		if (me.x + me.w < app.renderer.w) {
			me.x = app.renderer.w - me.w;
		}
		if (me.x > 0) {
			me.x = 0;
		}
		if (me.y + me.h < app.renderer.h) {
			me.y = app.renderer.h - me.h;
		}
		if (me.y > 0) {
			me.y = 0;
		}
	}
	this.saveSettings = function (song) {
		song.settingsPanelPositionY = me.horizontal.y;
		song.settingsPanelPositionX = me.horizontal.x;

		song.settingsKeysPositionY = me.keysBorder.y;
		song.settingsKeysPositionX = me.keysBorder.x;

		song.settingsPanelKeysX = me.panelKeys.x;

		song.settingsPanelMelodyX = me.panelMelody.x;
		song.settingsPanelMelodyY = me.panelMelody.y;
		song.settingsPanelBeatX = me.panelBeat.x;
		song.settingsPanelBeatY = me.panelBeat.y;
	};
	this.loadSettings = function (song) {
		me.panelMelody.x = 0 + song.settingsPanelMelodyX;
		me.panelMelody.y = 0 + song.settingsPanelMelodyY;
		me.panelBeat.x = 0 + song.settingsPanelBeatX;
		me.panelBeat.y = 0 + song.settingsPanelBeatY;
		me.horizontal.y = 0 + song.settingsPanelPositionY;
		me.horizontal.x = 0 + song.settingsPanelPositionX;
		me.horizontal.adjustBounds();

		me.keysBorder.y = 0 + song.settingsKeysPositionY;
		me.keysBorder.x = 0 + song.settingsKeysPositionX;
		me.panelKeys.x = 0 + song.settingsPanelKeysX;
		me.keysBorder.adjustBounds();
	};
	return this;
}
function PanelSong() {
	var me = this;
	this.visibled = true;
	this.x = 0;
	this.y = 0;
	this.w = 150;
	this.h = 150;
	this.deltaX = 0;
	this.deltaY = 0;
	this.cellWidth = 2 * tapSize;
	this.cellHeight = 3 * tapSize;
	this.init = function () {
		console.log("SlotPanel.init");
		app.renderer.layers[app.renderer.layers.length] = me;
		me.adjustZoom(app.song.zoom);
	};
	this.adjustZoom = function (z) {
		if (z == 0) {
			me.cellWidth = tapSize;
			me.cellHeight = tapSize;
		} else {
			if (z == 1) {
				me.cellWidth = 2 * tapSize;
				me.cellHeight = 3 * tapSize;
			} else {
				me.cellWidth = 5 * tapSize;
				me.cellHeight = 7 * tapSize;
			}
		}
		me.adjustSize();
	};
	/*this.highlight = function (idx) {
	app.highIndex = idx;
	app.renderer.context.fillStyle = "rgba(255,255,255,0.9)";
	app.renderer.context.fillRect(me.x, me.y, me.cellWidth, me.cellHeight);
	console.log("highlight", idx);
	};*/
	this.render = function (context) {
		try{
			context.drawImage(bgMain,0,0,800,450,0,app.renderer.h-450,800,450);
		}catch(e){
			console.log(e);
		}
		var xx = -1;
		var yy = -1;
		if (app.highIndex < app.slotMapX.length) {
			xx = app.slotMapX[app.highIndex];
			yy = app.slotMapY[app.highIndex];

		}
		if (app.testPlayOn) {
			if (app.mixer.mixSongPosition != null) {
				var barWidth = me.cellWidth / app.mixer.mixSong.meter;
				app.renderer.context.fillStyle = "rgba(255,255,255,0.5)";
				app.renderer.context.fillRect(//
					app.markBar * barWidth + me.x + me.cellWidth * app.mixer.mixSongPosition.left - 8 //
				, me.y + me.cellHeight * app.mixer.mixSongPosition.top //
				, 8 //
				, me.cellHeight //
				);
			}
		}
		for (var i = 0; i < app.song.positions.length; i++) {
			var p = app.song.positions[i];
			if (me.x + p.left * me.cellWidth + me.cellWidth > 0 //
				 && me.x + p.left * me.cellWidth < app.renderer.w //me.w //
				 && me.y + p.top * me.cellHeight + me.cellHeight > 0 //
				 && me.y + p.top * me.cellHeight < app.renderer.h //me.h //
			)
			{
				app.renderer.drawSlot(me.x, me.y, me.cellWidth, me.cellHeight, p);
				if (p.left == xx && p.top == yy && app.playOn) {
					//app.renderer.drawSlot(me.x, me.y, me.cellWidth, me.cellHeight, p);
					app.renderer.context.fillStyle = "rgba(255,255,255,0.3)";
					app.renderer.context.fillRect(me.x + me.cellWidth * p.left, me.y + me.cellHeight * p.top, me.cellWidth, me.cellHeight);
				}
				/*if (app.testPlayOn) {
				if (app.mixer.mixSongPosition != null) {
				if (p.left == app.mixer.mixSongPosition.left && p.top == app.mixer.mixSongPosition.top) {
				var barWidth = me.cellWidth / app.mixer.mixSong.meter;
				app.renderer.context.fillStyle = "rgba(255,255,255,0.5)";
				app.renderer.context.fillRect(//
				app.markBar * barWidth + me.x + me.cellWidth * p.left - 8 //, me.y + me.cellHeight * p.top //, 8 //, me.cellHeight //
				);
				}
				}
				}*/
			}
		}
		/*
		if (app.playOn) {
		var cuTime = me.playStartTime = new Date().getTime() - app.playStartTime;
		var fromStart = cuTime % app.mixedLength;
		var idx = Math.floor(fromStart / app.slotLength);
		if (idx != app.highIndex) {
		me.highlight(idx);
		}
		}*/
	};
	this.adjustSize = function () {
		var maxLeft = 0;
		var maxTop = 0;
		if(app.song.positions){
			for (var i = 0; i < app.song.positions.length; i++) {
				var p = app.song.positions[i];
				if (p.left > maxLeft) {
					maxLeft = p.left;
				}
				if (p.top > maxTop) {
					maxTop = p.top;
				}
			}
		}
		me.w = me.cellWidth * (maxLeft + 2);
		me.h = me.cellHeight * (maxTop + 2);
	};
	me.catchMove = function (x, y) {
		me.deltaX = me.x - x;
		me.deltaY = me.y - y;
		return true;
	};
	me.moveTo = function (x, y) {
		me.x = x + me.deltaX;
		me.y = y + me.deltaY;
	};
	me.endMove = function (x, y) {
		me.x = x + me.deltaX;
		me.y = y + me.deltaY;
		me.adjustContent();
	};
	me.afterTap = function (x, y) {
		me.x = x + me.deltaX;
		me.y = y + me.deltaY;
		var tx = Math.floor((x - me.x) / me.cellWidth);
		var ty = Math.floor((y - me.y) / me.cellHeight);
		me.showMenuFor(tx, ty);
		//console.log("SlotPanel.afterTap "+tx+"x"+ty);
	}
	me.showMenuFor = function (cx, cy) {
		//console.log('showMenuFor',cx, cy);
		var items = [];
		var isex = toolbox.existsPositionInSong(cx, cy, app.song);

		if (isex) {
			var p = toolbox.getPositionFromSong(cx, cy, app.song);
			items[items.length] = new Item(lang.open(), "", function () {
					//toolbox.findPosition(app.song.selectedPositionId,app.song) = p;
					app.showPosition(p);
				});
			items[items.length] = new Item("Play from slot", "", function () {
					if (app.mixerMode == 1 || app.mixerMode == 3) { //app.mixRealTime){
						app.lockedSlot = null;
						app.testPlay(p);
					} else {
						app.playSong(app.song, p);
					}
				});
			/*items[items.length] = new Item("Play", "", function () {
			toolbox.findPosition(app.song.selectedPositionId,app.song) = p;
			app.playPosition(toolbox.findPosition(app.song.selectedPositionId,app.song));
			});*/
			items[items.length] = new Item(lang.shiftLeft(), "", function () {
					if (cx == 0) {
						if (cy == 0) {
							app.promptWarning(lang.canNotShift());
						} else {
							var maxPre = 0;
							for (var i = 0; i < app.song.positions.length; i++) {
								var p = app.song.positions[i];
								if (p.top == cy - 1) {
									if (p.left > maxPre) {
										maxPre = p.left;
									}
								}
							}
							for (var i = 0; i < app.song.positions.length; i++) {
								var p = app.song.positions[i];
								if (p.top == cy) {
									p.top = p.top - 1;
									p.left = p.left + maxPre + 1;
								} else {
									if (p.top > cy) {
										p.top = p.top - 1;
										//p.left=p.left+maxPre+1;
									}
								}
							}
						}
					} else {
						if (toolbox.existsPositionInSong(cx - 1, cy, app.song)) {
							app.promptWarning(lang.canNotShift());
						} else {
							for (var i = 0; i < app.song.positions.length; i++) {
								var p = app.song.positions[i];
								if (p.top == cy) {
									if (p.left >= cx) {
										p.left = p.left - 1;
									}
								}
							}
						}
					}
				});
			items[items.length] = new Item(lang.shiftRight(), "", function () {
					for (var i = 0; i < app.song.positions.length; i++) {
						var p = app.song.positions[i];
						if (p.top == cy) {
							if (p.left >= cx) {
								p.left = p.left + 1;
							}
						}
					}
				});
			items[items.length] = new Item(lang.shiftNextRow(), "", function () {
					for (var i = 0; i < app.song.positions.length; i++) {
						var p = app.song.positions[i];
						if (p.top > cy) {
							p.top = p.top + 1;
						} else {
							if (p.top == cy && p.left >= cx) {
								p.top = p.top + 1;
								p.left = p.left - cx;
							}
						}
					}
				});
			items[items.length] = new Item("Set length", "", function () {
					me.promptPositionLength(p);
				});
			items[items.length] = new Item("Edit label", "", function () {
					var tt = prompt("Position label",p.comment);
					if(tt!=null && tt.trim().length>0){
						p.comment=tt.trim();
					}
				});
			items[items.length] = new Item("Clear slot", "", function () {
					app.promptConfirm("Remove slot " + cx + ":" + cy, function () {
						toolbox.clearPosition(cx, cy);
					});
				});
			items[items.length] = new Item("Roll forward", "", function () {					
					app.promptConfirm("Roll forward all riffs of " + cx + ":" + cy, function () {
						//console.log("Roll forward",p);
						toolbox.rollForward(p);
						app.renderer.clearCache();
						app.renderer.fireRender();
					});
				});
			items[items.length] = new Item("Roll backward", "", function () {
					app.promptConfirm("Roll backward all riffs of " + cx + ":" + cy, function () {
						//console.log("Roll backward",p);
						toolbox.rollBackward(p);
						app.renderer.clearCache();
						app.renderer.fireRender();
					});
				});
			app.promptSelect(lang.slot() + " " + cx + "x" + cy, items);
		} else {
			var p = toolbox.getPositionFromSong(cx, cy, app.song);
			app.showPosition(p);
			/*
			items[items.length] = new Item(lang.open(), "", function () {
			var p = toolbox.getPositionFromSong(cx, cy, app.song);
			app.showPosition(p);
			});
			 */
		}
		//app.promptSelect(lang.slot() + " " + cx + "x" + cy, items);
	};
	this.promptPositionLength = function (position) {
		//console.log(position);
		var items = [];
		items[items.length] = new Item("Same as meter", "", function () {
				position.length = 0;
			});
		items[items.length] = new Item("8/16", "", function () {
				position.length = 8;
			});
		items[items.length] = new Item("12/16", "", function () {
				position.length = 12;
			});
		items[items.length] = new Item("16/16", "", function () {
				position.length = 16;
			});
		items[items.length] = new Item("20/16", "", function () {
				position.length = 20;
			});
		items[items.length] = new Item("24/16", "", function () {
				position.length = 24;
			});
		items[items.length] = new Item("28/16", "", function () {
				position.length = 28;
			});
		items[items.length] = new Item("32/16", "", function () {
				position.length = 32;
			});
		items[items.length] = new Item("48/16", "", function () {
				position.length = 48;
			});
		app.promptSelect("Length of slot " + position.left + "x" + position.top + " is " + position.length, items);
	};
	this.adjustContent = function () {
		me.adjustSize();
		//logger.dump(me.y + "/" + ((octaveCount - firstOctave) * 12 * cellSize));
		if (me.x + me.w < app.renderer.w) {
			me.x = app.renderer.w - me.w;
		}
		if (me.x > 0) {
			me.x = 0;
		}
		if (me.y + me.h < app.renderer.h) {
			me.y = app.renderer.h - me.h;
		}
		if (me.y > 0) {
			me.y = 0;
		}
		//logger.dump(me.y );
	}
	this.saveSettings = function (song) {
		song.settingsPanelSongX = me.x;
		song.settingsPanelSongY = me.y;

	};
	this.loadSettings = function (song) {
		me.x = song.settingsPanelSongX;
		me.y = song.settingsPanelSongY;
		me.adjustContent();
	};
	return this;
}
function Pcm(){
	var me = this;
	this.sampleRate=
		//8000;
		//22050;
		44100;
	this.chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
	this.encLookup = [];
	for ( var i = 0; i < 4096; i++) {
		me.encLookup[i] = me.chars[i >> 6] + me.chars[i & 0x3F];
	}
	this.encode = function(src){
		console.log("start encode");
		var len = src.length;
		var dst = '';
		var i = 0;
		while (len > 2) {
			n = (src[i] << 16) | (src[i + 1] << 8) | src[i + 2];
			dst = dst + me.encLookup[n >> 12] + me.encLookup[n & 0xFFF];
			len = len - 3;
			i = i + 3;
		}
		if (len > 0) {
			var n1 = (src[i] & 0xFC) >> 2;
			var n2 = (src[i] & 0x03) << 4;
			if (len > 1) {
				n2 |= (src[++i] & 0xF0) >> 4;
			}
			dst = dst + me.chars[n1];
			dst = dst + me.chars[n2];
			if (len == 2) {
				var n3 = (src[i++] & 0x0F) << 2;
				n3 = n3 | (src[i] & 0xC0) >> 6;
				dst = dst + me.chars[n3];
			}
			if (len == 1) {
				dst = dst + '=';
			}
			dst = dst + '=';
		}
		console.log("done encode");
		return dst;
	};
	this.u32ToArray = function(i){
		var b0 = i & 0xFF;
		var b1 = (i >> 8) & 0xFF;
		var b2 = (i >> 16) & 0xFF;
		var b3 = (i >> 24) & 0xFF;
		return [
		        b0, b1, b2, b3
		];
	};
	this.u16ToArray = function(i){
		var b0 = i & 0xFF;
		var b1 = (i >> 8) & 0xFF;
		return [
		        b0, b1
		];
		/*return [
		        i & 0xFF, (i >> 8) & 0xFF
		];*/
	};
	this.split16bitArray = function(data){
		var r = [];
		var j = 0;
		var len = data.length;
		for ( var i = 0; i < len; i++) {
			r[j] = data[i] & 0xFF;
			j++;
			r[j] = (data[i] >> 8) & 0xFF;
			j++;
		}
		return r;
	};
	this.make = function(data){
		var bitsPerSample = 8;
		var subChunk2Size = data.length * (bitsPerSample >> 3);
		var chunkSize = 36 + subChunk2Size;
		var numChannels = 1;
		var blockAlign = (numChannels * bitsPerSample) >> 3;
		//var sampleRate = 44100;
		console.log("subChunk2Size " + subChunk2Size);
		console.log("chunkSize " + chunkSize);
		var wav = [
		        0x52, 0x49, 0x46, 0x46
		]// 0    4    "RIFF" = 0x52494646
		.concat(//
		me.u32ToArray(chunkSize) // 4    4    36+SubChunk2Size = 4+(8+SubChunk1Size)+(8+SubChunk2Size)
		, [
		        0x57, 0x41, 0x56, 0x45
		]// 8    4    "WAVE" = 0x57415645
		, [
		        0x66, 0x6d, 0x74, 0x20
		]// 12   4    "fmt " = 0x666d7420
		, me.u32ToArray(16) // 16   4    16 for PCM
		, me.u16ToArray(1) // 20   2    PCM = 1
		, me.u16ToArray(numChannels) // 22   2    Mono = 1, Stereo = 2...
		, me.u32ToArray(this.sampleRate) // 24   4    8000, 44100...
		, me.u32ToArray(blockAlign * this.sampleRate) // 28   4    SampleRate*NumChannels*BitsPerSample/8
		, me.u16ToArray(blockAlign) // 32   2    NumChannels*BitsPerSample/8
		, me.u16ToArray(bitsPerSample) // 34   2    8 bits = 8, 16 bits = 16
		, [
		        0x64, 0x61, 0x74, 0x61
		]// 36   4    "data" = 0x64617461
		, me.u32ToArray(subChunk2Size) // 40   4    data size = NumSamples*NumChannels*BitsPerSample/8
		, data //split16bitArray(data) if bitsPerSample == 16
		);
		var enc = me.encode(wav);
		var dataURI = 'data:audio/wav;base64,' + enc;
		return dataURI;
	};
	return me;
}
function Renderer() {
	var me = this;
	this.needRender = true;
	this.scoreCanvas = null;
	this.context = null;
	this.mouseDownMode = false;
	this.startMouseX = 0;
	this.startMouseY = 0;
	this.endMouseX = 0;
	this.endMouseY = 0;
	this.w = 0;
	this.h = 0;
	this.interaction = null;
	this.layers = [];
	this.fireRender = function () {
		me.needRender = true;
	};
	this.cacheSlotsRiffs = [];
	this.cachedZoom=0;
	this.clearCache = function () {
		//me.cacheSlotsRiffs = [];
		for(var i=0;i<me.cacheSlotsRiffs.length;i++){
			me.cacheSlotsRiffs[i].valid=false;
		}
	};
	this.onResize = function () {
		me.scoreCanvas.width = window.innerWidth;
		me.scoreCanvas.height = window.innerHeight;
		me.w = window.innerWidth;
		me.h = window.innerHeight;

		me.menuSlot.vertical.adjustBounds();
		me.menuRiffs.vertical.adjustBounds();
		//me.menuExamples.vertical.adjustBounds();
		me.menuSamples.vertical.adjustBounds();

		me.panelPosition.horizontal.adjustBounds();
		me.panelPosition.keysBorder.adjustBounds();

		me.fireRender();
	};
	this.checkTouch = function () {
		for (var i = me.layers.length - 1; i >= 0; i--) {
			if (me.layers[i].visibled) {
				if (me.layers[i].catchMove(me.startMouseX, me.startMouseY)) {
					me.interaction = me.layers[i];
					break;
				}
			}
		}
	};
	this.checkDrag = function () {
		if (me.interaction != null) {
			me.interaction.moveTo(me.endMouseX, me.endMouseY);
		}
	};
	this.checkRelease = function () {
		if (me.interaction != null) {
			me.interaction.endMove(me.endMouseX, me.endMouseY);
			if (Math.abs(me.endMouseX - me.startMouseX) < tapSize / 4 && Math.abs(me.endMouseY - me.startMouseY) < tapSize / 4) {
				me.interaction.afterTap(me.startMouseX, me.startMouseY);
			}
		}
		me.interaction = null;
	};
	this.onmousedown = function (mouseEvent) {
		me.mouseDownMode = true;
		me.startMouseX = mouseEvent.clientX;
		me.startMouseY = mouseEvent.clientY;
		me.endMouseX = mouseEvent.clientX;
		me.endMouseY = mouseEvent.clientY;
		me.checkTouch();
		me.needRender = true;
	};
	this.onmousemove = function (mouseEvent) {
		if (me.mouseDownMode) {
			me.endMouseX = mouseEvent.clientX;
			me.endMouseY = mouseEvent.clientY;
			me.checkDrag();
			me.needRender = true;
		}
	};
	this.onmouseup = function (mouseEvent) {
		me.endMouseX = mouseEvent.clientX;
		me.endMouseY = mouseEvent.clientY;
		me.mouseDownMode = false;
		me.checkRelease();
		me.needRender = true;
		/*console.log("end");
		app.promptConfirm("zdfdfbvdzsfbdfbv fasv afbv adfb dfb dfbsfbaesbafbafeb afb afb afb aefb afe"
		+"zdfdfbvdzsfbdfbv fasv afbv adfb dfb dfbsfbaesbafbafeb afb afb afb aefb afe"
		+"zdfdfbvdzsfbdfbv fasv afbv adfb dfb dfbsfbaesbafbafeb afb afb afb aefb afe"
		+"zdfdfbvdzsfbdfbv fasv afbv adfb dfb dfbsfbaesbafbafeb afb afb afb aefb afe"
		+"zdfdfbvdzsfbdfbv fasv afbv adfb dfb dfbsfbaesbafbafeb afb afb afb aefb afe"
		+"zdfdfbvdzsfbdfbv fasv afbv adfb dfb dfbsfbaesbafbafeb afb afb afb aefb afe"
		+"zdfdfbvdzsfbdfbv fasv afbv adfb dfb dfbsfbaesbafbafeb afb afb afb aefb afe"
		+"zdfdfbvdzsfbdfbv fasv afbv adfb dfb dfbsfbaesbafbafeb afb afb afb aefb afe"
		);*/
	};
	this.ontouchstart = function (touchEvent) {
		touchEvent.preventDefault();
		me.mouseDownMode = true;
		var touches = touchEvent.touches;
		var first = touches[0];
		me.startMouseX = first.clientX;
		me.startMouseY = first.clientY;
		me.endMouseX = first.clientX;
		me.endMouseY = first.clientY;
		me.checkTouch();
		me.needRender = true;
	};
	this.ontouchend = function (touchEvent) {
		touchEvent.preventDefault();
		var touches = touchEvent.changedTouches;
		var first = touches[0];
		me.endMouseX = first.clientX;
		me.endMouseY = first.clientY;
		me.mouseDownMode = false;
		me.checkRelease();
		me.needRender = true;
	};
	this.ontouchmove = function (touchEvent) {
		touchEvent.preventDefault();
		if (me.mouseDownMode) {
			var touches = touchEvent.touches;
			var first = touches[0];
			me.endMouseX = first.clientX;
			me.endMouseY = first.clientY;
			me.checkDrag();
			me.needRender = true;
		}
	};
	/*this.initSlotMenu=function(){
	me.panelSlotMenu=new Vertical();

	var listSlotMenu = new List();
	me.panelSlotMenu.content=listSlotMenu;
	listSlotMenu.x = me.panelSlotMenu.x + 0.5 * tapSize;
	listSlotMenu.add(new Item("test", "Item for testing", function () {
	//
	console.log("tap test");
	}));
	listSlotMenu.add(new Item("test 2", "2 Item for testing", function () {
	//
	console.log("tap test 2");
	}));
	me.layers[this.layers.length]=listSlotMenu;
	me.layers[this.layers.length]=me.panelSlotMenu;
	};*/
	this.init = function () {
		console.log("Renderer.init");
		toolbox.adjustSong(app.song);
		me.scoreCanvas = document.getElementById("scoreCanvas");
		me.context = me.scoreCanvas.getContext("2d");
		me.context.textBaseline = "top";
		me.scoreCanvas.onmousedown = me.onmousedown;
		me.scoreCanvas.onmouseup = me.onmouseup;
		me.scoreCanvas.onmousemove = me.onmousemove;
		me.scoreCanvas.ontouchstart = me.ontouchstart;
		me.scoreCanvas.ontouchend = me.ontouchend;
		me.scoreCanvas.ontouchmove = me.ontouchmove;
		//me.verticalSlotMenu=new Vertical();
		//me.layers[this.layers.length]=me.verticalSlotMenu;
		//me.initSlotMenu();
		me.panelSong = new PanelSong();

		me.panelSong.init();
		me.panelPosition = new PanelPosition();
		me.panelPosition.init();
		me.menuSlot = new MenuSlot();
		me.menuSlot.init();
		me.menuSlot.vertical.icon = toolbox.iconMenu;
		me.menuRiffs = new MenuRiffs();
		me.menuRiffs.init();
		me.menuRiffs.vertical.icon = toolbox.iconRiffs;
		me.menuSamples = new MenuSamples();
		me.menuSamples.init();
		me.menuSamples.vertical.icon = toolbox.iconSample;
		/*
		me.menuExamples = new MenuExamples();
		me.menuExamples.init();
		me.menuExamples.vertical.icon = toolbox.iconSongs;
		 */
		me.refreshSong();
		console.log("attached");
	};
	this.refreshSong = function () {
		toolbox.adjustSamples(app.song);
		me.panelSong.adjustZoom(app.song.zoom);
		me.menuSamples.refresh();
		me.menuRiffs.refresh();
		me.menuSlot.refresh();
		me.fireRender();
	};
	this.string = function (msg, size, x, y) {
		me.context.fillStyle = "#ffffff";
		me.context.textBaseline = "top";
		me.context.font = size * tapSize + "px Arial";
		me.context.fillText(msg, x, y);
	};
	this.text = function (msg, size, x, y, width, lh) {
		width = width || 0;
		var lineHeight = lh * tapSize;
		me.context.fillStyle = "#ffffff";
		me.context.textBaseline = "top";
		me.context.font = size * tapSize + "px Arial";
		if (width <= 0) {
			me.context.fillText(msg, x, y);
			return;
		}
		var words = msg.split(' ');
		var currentLine = 0;
		var idx = 1;
		while (words.length > 0 && idx <= words.length) {
			var str = words.slice(0, idx).join(' ');
			var w = me.context.measureText(str).width;
			if (w > width) {
				if (idx == 1) {
					idx = 2;
				}
				me.context.fillText(words.slice(0, idx - 1).join(' '), x, y + (lineHeight * currentLine));
				currentLine++;
				words = words.splice(idx - 1);
				idx = 1;
			} else {
				idx++;
			}
		}
		if (idx > 0) {
			me.context.fillText(words.join(' '), x, y + (lineHeight * currentLine));
		}
	};
	this.saveSettings = function (song) {
		console.log("Renderer.saveSettings");
		me.menuSlot.saveSettings(song);
		//me.menuExamples.saveSettings(song);
		me.menuRiffs.saveSettings(song);
		me.menuSamples.saveSettings(song);
		me.panelPosition.saveSettings(song);
		me.panelSong.saveSettings(song);
		song.lastSaved = new Date();
		/*for (var i = 0; i < me.layers.length; i++) {
		me.layers[i].saveSettings(song);
		}*/
	};
	this.loadSettings = function (song) {
		console.log("Renderer.loadSettings");
		//console.log(song.settingsMenuSamplesX);
		toolbox.adjustSong(app.song);
		//console.log(song.settingsMenuExamplesX);
		me.menuSlot.loadSettings(song);
		//me.menuExamples.loadSettings(song);
		me.menuRiffs.loadSettings(song);
		me.menuSamples.loadSettings(song);

		me.panelPosition.loadSettings(song);
		me.panelSong.loadSettings(song);
		/*for (var i = 0; i < me.layers.length; i++) {
		console.log("Renderer.loadSettings "+i);
		console.log(me.layers[i]);
		me.layers[i].loadSettings(song);
		}*/
	};
	this.render = function () {

		if (app.playedSlotChanged()) {
			app.renderer.needRender = true;

		}
		if (app.markChanged) {
			app.renderer.needRender = true;
			app.markChanged = false;
		}
		if (app.renderer.needRender) {
			//me.context.translate(-0.5, -0.5);
			me.context.fillStyle = "#000000";
			me.context.fillRect(0, 0, me.w, me.h);
			//console.log("Renderer.render "+me.w+"x"+me.h);
			for (var i = 0; i < me.layers.length; i++) {
				if (me.layers[i].visibled) {
					me.layers[i].render(me.context);
				}
			}
			//me.context.translate(0.5, 0.5);
			//me.context.fillStyle="#FF0000";
			//me.context.font="30px Arial";
			//me.context.font = 0.35 * tapSize + "px Arial";
			//me.context.fillText("Hello World",0,0);
			//me.string("zsdsthsr eghsebrtg rgaesrg aerg aarf arhrtjdresthj srth swaerga garargarsrthdrth resth er thje garaegs awrg arg arg areg aesrthdrsth srth srth rg areg arg areg argarsrthsths th srthg arg arg a"
			//,0.35,0,0,300,0.5);
			//me.context.fillText(item.caption, me.x + 1.1 * tapSize, me.y + 0.1 * tapSize + i * tapSize);
			//
			me.needRender = false;
		}
	};
	this.drawHighlight = function (x, y, w, h, highlight) {
		if (highlight) {
			me.context.fillStyle = "rgba(255,255,255,0.5)";
		} else {
			me.context.fillStyle = "rgba(255,255,255,0.2)";
		}
		me.context.fillRect(x, y, w - 8, h - 8);
	};
	/*this.calculateColor=function(path){
	//console.log(path);
	return "#ff0000";
	};*/

	this.drawRiff = function (x, y, w, h, songRiff, meter) {
		if (songRiff != null) {
			//me.context.strokeStyle = "rgba(255,255,255,0.75)";
			//me.context.lineCap = "round";
			me.context.strokeStyle = "#ffffff";
			var dotW = w / meter;
			var dotH = h / (81 - 35 + 1);
			//me.context.lineWidth = dotW;
			//console.log(w+"/"+meter+"="+dotW+", "+h+"/(81 - 35 + 1)="+dotH);
			/*if (dotW < 1) {
			dotW = 1;
			}
			if (dotH < 1) {
			dotH = 1;
			}*/
			//me.context.globalAlpha = 0.7;
			me.context.lineWidth = dotW;
			me.context.lineCap = "round";
			me.context.beginPath();
			if (songRiff.beat) {
				for (var step = 0; step < songRiff.beat.length; step++) {
					var chord = songRiff.beat[step];
					if(!chord){
							chord=[];
							songRiff.beat[step]=chord;
						}
					for (var c = 0; c < chord.length; c++) {
						var songRiffBeatPoint = chord[c];
						var yy = this.findSampleOrder(songRiffBeatPoint.sampleId);
						//me.context.fillRect(x + step * dotW, y + yy * dotH, 1, 1);

						//me.context.lineWidth = dotW;
						//me.context.lineCap = "round";
						me.context.moveTo(x + step * dotW, y + yy * dotH);
						me.context.lineTo(x + step * dotW, y + yy * dotH + 1);

					}
				}
			}
			me.context.stroke();
			me.context.closePath();
			dotH = h / 128;
			/*if (dotH < 1) {
			dotH = 1;
			}*/
			//console.log("songRiff.tunes.length "+songRiff.tunes.length);
			if (songRiff.tunes) {
				for (var layer = 0; layer < songRiff.tunes.length; layer++) {
					var songRiffTune = songRiff.tunes[layer];
					var songSample = toolbox.findSampleById(songRiffTune.sampleId, app.song);
					if (songSample == undefined) {
						me.context.strokeStyle = "#ffffff";
					} else {
						me.context.strokeStyle = songSample.color;
					}
					me.context.lineWidth = dotW;
					me.context.lineCap = "round";
					//me.context.beginPath();
					for (var step = 0; step < songRiffTune.steps.length; step++) {
						var chord = songRiffTune.steps[step];
						if(!chord){
							chord=[];
							songRiffTune.steps[step]=chord;
						}
						for (var c = 0; c < chord.length; c++) {
							me.context.beginPath();
							var songRiffTunePoint = chord[c];
							var yy = 128 - songRiffTunePoint.pitch;
							me.context.strokeStyle = toolbox.calculatePitchColor(songRiffTunePoint.pitch, songSample);
							me.context.moveTo(//
								x + step * dotW //
							, y + yy * dotH //
							);
							me.context.lineTo(//
								x + step * dotW + (songRiffTunePoint.length - 1) * dotW + 1 //
							, y + yy * dotH - songRiffTunePoint.shift * dotH //
							);
							me.context.stroke();
							me.context.closePath();
						}
					}
					//me.context.stroke();
					//me.context.closePath();
				}
			}
			me.context.lineWidth = 1;
			//me.context.globalAlpha = 1;
		}
	};
	this.drawRiffTo = function (slotContext,x, y, w, h, songRiff, meter) {
		if (songRiff != null) {
			slotContext.strokeStyle = "#ffffff";
			var dotW = w / meter;
			var dotH = h / (81 - 35 + 1);
			slotContext.lineWidth = dotW;
			slotContext.lineCap = "round";
			slotContext.beginPath();
			if (songRiff.beat) {
				for (var step = 0; step < songRiff.beat.length; step++) {
					var chord = songRiff.beat[step];
					if(!chord){
							chord=[];
							songRiff.beat[step]=chord;
						}
					for (var c = 0; c < chord.length; c++) {
						var songRiffBeatPoint = chord[c];
						var yy = this.findSampleOrder(songRiffBeatPoint.sampleId);
						slotContext.moveTo(x + step * dotW, y + yy * dotH);
						slotContext.lineTo(x + step * dotW, y + yy * dotH + 1);
					}
				}
			}
			slotContext.stroke();
			slotContext.closePath();
			dotH = h / 128;
			if (songRiff.tunes) {
				for (var layer = 0; layer < songRiff.tunes.length; layer++) {
					var songRiffTune = songRiff.tunes[layer];
					var songSample = toolbox.findSampleById(songRiffTune.sampleId, app.song);
					if (songSample == undefined) {
						slotContext.strokeStyle = "#ffffff";
					} else {
						slotContext.strokeStyle = songSample.color;
					}
					slotContext.lineWidth = dotW;
					slotContext.lineCap = "round";
					for (var step = 0; step < songRiffTune.steps.length; step++) {
						var chord = songRiffTune.steps[step];
						if(!chord){
							chord=[];
							songRiffTune.steps[step]=chord;
						}
						for (var c = 0; c < chord.length; c++) {
							slotContext.beginPath();
							var songRiffTunePoint = chord[c];
							var yy = 128 - songRiffTunePoint.pitch;
							slotContext.strokeStyle = toolbox.calculatePitchColor(songRiffTunePoint.pitch, songSample);
							slotContext.moveTo(//
								x + step * dotW //
							, y + yy * dotH //
							);
							slotContext.lineTo(//
								x + step * dotW + (songRiffTunePoint.length - 1) * dotW + 1 //
							, y + yy * dotH - songRiffTunePoint.shift * dotH //
							);
							slotContext.stroke();
							slotContext.closePath();
						}
					}
				}
			}
			slotContext.lineWidth = 1;
		}
	};
	this.makeSlotCache=function(position,w,h){
		if(me.cachedZoom!=app.song.zoom){
			me.cacheSlotsRiffs = [];
		}
		me.cachedZoom=app.song.zoom;
		var slotCache=null;
		for(var i=0;i<me.cacheSlotsRiffs.length;i++){
			if(me.cacheSlotsRiffs[i].id==position.id){
				if(me.cacheSlotsRiffs[i].valid){
					return me.cacheSlotsRiffs[i];
					//
					//
					//
				}else{
					slotCache=me.cacheSlotsRiffs[i];
					break;
				}
			}
		}
		if(slotCache==null){
			//console.log('new cache for ',position);
			slotCache={
				id:position.id
				,canvas:null
				,valid:false
			};
			me.cacheSlotsRiffs.push(slotCache);
		}
		//console.log('build cache for ',position);
		if(slotCache.canvas==null){
			slotCache.canvas=document.createElement("canvas");
			slotCache.canvas.width=w*2;
			slotCache.canvas.height=h;
		}
		var workContext=slotCache.canvas.getContext("2d");
		workContext.clearRect(0, 0, w,h);
		//workContext.fillStyle = "#ffffff";
		//workContext.fillRect(0,0,w,h);
		for (var i = 0; i < position.riffIds.length; i++) {
			var riffId = position.riffIds[i];
			var songRiff = toolbox.findRiffById(riffId, app.song);
			//workContext.clearRect(0, 0, w,h);
			//workContext.fillStyle = "#ffffff";
			//workContext.fillRect(0,0,w,h);
			me.drawRiffTo(workContext,0 , 0 , w, h, songRiff, app.song.meter);
			}
		slotCache.valid=true;
		return slotCache;
	};
	this.drawSlot = function (dx, dy, w, h, position) {
		var x = position.left;
		var y = position.top;
		if (dx + x * w + w < 0
			 || dx + x * w > me.w
			 || dy + y * h + h < 0
			 || dy + y * h > me.h) {
			return;
		}
		/*var dotW = w / app.song.meter;
		var dotH = h / (81 - 35 + 1);
		if (dotW < 1)
		dotW = 1;
		if (dotH < 1)
		dotH = 1;*/
		//me.context.fillStyle = "rgba(255,255,255,0.15)";
		var highlight = false;
		/*var songPosition = toolbox.findPosition(app.song.selectedPositionId, app.song, true);
		if (songPosition != null) {
		if (songPosition.left == x && songPosition.top == y) {
		//me.context.fillStyle = "rgba(255,255,255,0.5)";
		highlight = true;
		}
		}*/
		var hiw = w;
		if (position.length > 0) {
			//console.log(position.length,"/",app.song.meter);
			hiw = w * position.length / app.song.meter;
		}

		me.drawHighlight(dx + x * w + 4, dy + y * h + 4, hiw, h, highlight);

		//me.context.fillRect(dx + x * w + 2, dy + y * h + 2, w - 4, h - 4);
		me.context.fillStyle = "#ffffff";
		me.context.textBaseline = "top";
		me.context.font = 0.35 * tapSize + "px Arial";
		var txt = "" + x + ":" + y;
		if (position.length > 0) {
			txt = txt + " /" + position.length;
		}
		if(position.comment){
			if(position.comment.trim().length>0){
					txt = txt + " " + position.comment;
				}
			}
		me.context.fillText(txt, dx + x * w + 8, dy + y * h + 8);
		if (position.riffIds) {
			var cnv=this.makeSlotCache(position,w,h);
			me.context.drawImage(cnv.canvas, dx + x * w + 4, dy + y * h + 4);
			/*for (var i = 0; i < position.riffIds.length; i++) {
				var riffId = position.riffIds[i];
				var songRiff = toolbox.findRiffById(riffId, app.song);
				me.drawRiff(dx + x * w + 4, dy + y * h + 4, w, h, songRiff, app.song.meter);
			}*/
		}
	};
	this.findSampleOrder = function (id) {
		for (var k = 0; k < app.song.samples.length; k++) {
			var songSample = app.song.samples[k];
			if (songSample.id == id) {
				return k;
			}
		}
		return -1;
	};
	return this;
}
function Select() {
	var me = this;
	this.y = 0;
	this.size = tapSize;
	this.highlight = null;
	this.deltaY = 0;
	this.visibled = false;
	this.caption = "Select something";
	this.items = [];
	this.action = null;
	this.renderItem = function (context, i) {
		var item = me.items[i];
		context.fillStyle = "#ffffff";
		context.textBaseline = "top";
		context.font = 0.35 * tapSize + "px Arial";
		context.fillText(item.caption, 0.1 * tapSize, me.y + 1.1 * tapSize + i * tapSize+ tapSize);
		context.font = 0.25 * tapSize + "px Arial";
		context.fillText(item.description, 0.1 * tapSize, me.y + 1.5 * tapSize + i * tapSize+ tapSize);
	};
	this.render = function (context) {

		context.fillStyle = "rgba(32,32,32,0.9)";
		context.fillRect(0, tapSize, app.renderer.w, app.renderer.h - tapSize);

		if (me.highlight != null) {
			context.fillStyle = "rgba(255,255,255,0.25)";
			context.fillRect(0, me.y + me.highlight * tapSize + tapSize+ tapSize, app.renderer.w, tapSize);
		}
		for (var i = 0; i < me.items.length; i++) {
			if (i * tapSize + me.y > -tapSize && i * tapSize + me.y < app.renderer.h) {
				me.renderItem(context, i);
			}
		}
		context.fillStyle = "#000000";
		context.fillRect(0, 0, app.renderer.w, tapSize * 2);
		app.renderer.text(me.caption, 0.35, 0.1 * tapSize, 0.5 * tapSize, app.renderer.w - tapSize, 0.4);
		context.fillStyle = "#ffffff";
		context.fillRect(0, 2 * tapSize, app.renderer.w, 1); //line
		context.beginPath();
		context.arc(app.renderer.w - 1.0 * tapSize, 1.0 * tapSize, 0.5 * tapSize, 0, Math.PI * 2);
		context.fillStyle = "#000000";
		context.strokeStyle = "#ffffff";
		
		context.fill();
		context.lineWidth = 2;
		context.stroke();
		context.lineWidth = 1;
		context.strokeStyle = "rgba(255,255,255,0.5)";
		context.beginPath();
		context.moveTo(app.renderer.w - 0.8 * tapSize, 0.8 * tapSize);
		context.lineTo(app.renderer.w - 1.2 * tapSize, 1.2 * tapSize);
		context.stroke();
		context.beginPath();
		context.moveTo(app.renderer.w - 1.2 * tapSize, 0.8 * tapSize);
		context.lineTo(app.renderer.w - 0.8 * tapSize, 1.2 * tapSize);
		context.stroke();

	};
	this.catchMove = function (x, y) {
		me.deltaY = me.y - y;

		var n = Math.floor((y - me.y - 2*tapSize) / tapSize);
		if (n > -1 && n < me.items.length) {
			me.highlight = n;
		}
		return true;
	};
	this.moveTo = function (x, y) {
		me.y = y + me.deltaY;
	};
	this.endMove = function (x, y) {
		var yDelta = y + me.deltaY;
		var itemsH = me.items.length * tapSize;
		if (app.renderer.h - tapSize > itemsH) {
			yDelta = 0;
		} else {
			if (yDelta < app.renderer.h - tapSize*2 - itemsH) {
				yDelta = app.renderer.h - itemsH - tapSize*2;
			}
			if (yDelta > 0) {
				yDelta = 0;
			}
		}
		me.y = yDelta;
		me.highlight = null;
	};
	this.afterTap = function (x, y) {
		me.y = y + me.deltaY;
		if (y < 2 * tapSize) {
			me.visibled = false;
		} else {

				var n = Math.floor((y - me.y - tapSize-tapSize) / tapSize);
				if (n > -1 && n < me.items.length) {
					me.visibled = false;
					if (me.items[n].action != null) {
						me.items[n].action();
						if (me.action != null) {
							me.action();
						}
					}

				}
			
			me.highlight = null;
		}
	};
	/*this.saveSettings=function(song){
	//
	};
	this.loadSettings=function(song){
	//
	};*/
	return me;
}
function Song() {
	this.id = randomKey(); //"" + Math.floor(1000000 * Math.random());
	this.tempo = 120;
	this.meter = 32;
	this.comment = "";
	this.positions = [];
	this.riffs = [];
	this.samples = [];
	//this.settingsMenuExamplesX = 0;
	//this.settingsMenuExamplesY = 0;
	//this.settingsMenuSlotX = 0;
	//this.settingsMenuSlotY = 0;
	this.zoom = 1;
	this.zoomPosition = 1;
	this.selectedSampleId = null;
	this.selectedRiffId = null;
	this.selectedPositionId = null;
	this.settingsPanelPositionY = 0;
	this.settingsPanelPositionX = 0;
	this.settingsPanelMelodyX = 0;
	this.settingsPanelMelodyY = 0;
	this.settingsPanelBeatX = 0;
	this.settingsPanelBeatY = 0;
	
	this.settingsPanelSongX =0;
		this.settingsPanelSongY = 0;
	return this;
}
function SongPosition(){
	this.id = randomKey();//"" + Math.floor(1000000 * Math.random());
	this.left=0;
	this.top=0;
	this.length=0;
	this.comment="";
	this.songId=null;
	this.riffIds=[];
	return this;
}
function SongRiff(){
	this.id = randomKey();//"" + Math.floor(1000000 * Math.random());
	this.songId=null;
	this.comment="";
	this.beat=[];
	this.tunes=[];
	this.length=16;
	return this;
}
function SongRiffBeatPoint(){
	this.id = randomKey();//"" + Math.floor(1000000 * Math.random());
	this.riffId=null;
	this.sampleId=null;
	//this.step=0;
	return this;
}
function SongRiffTune(){
	this.id = randomKey();//"" + Math.floor(1000000 * Math.random());
	this.riffId=null;
	this.sampleId=null;
	//this.color="#00ff99";
	this.steps=[];
	return this;
}
function SongRiffTunePoint(){
	this.id = randomKey();//"" + Math.floor(1000000 * Math.random());
	this.tuneId=null;
	this.pitch=0;
	this.length=0;
	this.shift=0;
	//this.step=0;
	return this;
}
function SongSample(){
	//var me=this;
	this.id = randomKey();//"" + Math.floor(1000000 * Math.random());
	this.songId=null;
	//this.id=null;
	this.color="#00ff99";
	this.midi=0;
	this.volume=0.7;
	this.path="";
	//this.note
	//this.arrayBuffer=null;
	//this.reset=function(id){
	this.isDrum=false;
	this.pitchStart=0;
	this.pitchEnd=0;
	this.loopStart=0;
	this.loopEnd=0;
	this.basePitch=0;
	this.correction=0;
	this.sampleRate=0;
	return this;
}
function Toolbox() {
	var me = this;

	this.colorizer = [];
	this.colorizer[0] = "#FFFFFF";
	this.colorizer[1] = "#FF6600";
	this.colorizer[2] = "#FF9900";
	this.colorizer[3] = "#00FF00";
	this.colorizer[4] = "#0000FF";
	this.colorizer[5] = "#FFFF00";
	this.colorizer[6] = "#FF0000";
	this.colorizer[7] = "#FF00FF";
	this.colorizer[8] = "#00CC99";
	this.colorizer[9] = "#0099FF";
	this.colorizer[10] = "#FF9900";
	this.colorizer[11] = "#FF6600";

	this.drumNames = [];

	this.drumNames[35] = "Bass Drum 2";
	this.drumNames[36] = "Bass Drum 1";
	this.drumNames[37] = "Side Stick/Rimshot";
	this.drumNames[38] = "Snare Drum 1";
	this.drumNames[39] = "Hand Clap";
	this.drumNames[40] = "Snare Drum 2";
	this.drumNames[41] = "Low Tom 2";
	this.drumNames[42] = "Closed Hi-hat";
	this.drumNames[43] = "Low Tom 1";
	this.drumNames[44] = "Pedal Hi-hat";
	this.drumNames[45] = "Mid Tom 2";
	this.drumNames[46] = "Open Hi-hat";
	this.drumNames[47] = "Mid Tom 1";
	this.drumNames[48] = "High Tom 2";
	this.drumNames[49] = "Crash Cymbal 1";
	this.drumNames[50] = "High Tom 1";
	this.drumNames[51] = "Ride Cymbal 1";
	this.drumNames[52] = "Chinese Cymbal";
	this.drumNames[53] = "Ride Bell";
	this.drumNames[54] = "Tambourine";
	this.drumNames[55] = "Splash Cymbal";
	this.drumNames[56] = "Cowbell";
	this.drumNames[57] = "Crash Cymbal 2";
	this.drumNames[58] = "Vibra Slap";
	this.drumNames[59] = "Ride Cymbal 2";
	this.drumNames[60] = "High Bongo";
	this.drumNames[61] = "Low Bongo";
	this.drumNames[62] = "Mute High Conga";
	this.drumNames[63] = "Open High Conga";
	this.drumNames[64] = "Low Conga";
	this.drumNames[65] = "High Timbale";
	this.drumNames[66] = "Low Timbale";
	this.drumNames[67] = "High Agogo";
	this.drumNames[68] = "Low Agogo";
	this.drumNames[69] = "Cabasa";
	this.drumNames[70] = "Maracas";
	this.drumNames[71] = "Short Whistle";
	this.drumNames[72] = "Long Whistle";
	this.drumNames[73] = "Short Guiro";
	this.drumNames[74] = "Long Guiro";
	this.drumNames[75] = "Claves";
	this.drumNames[76] = "High Wood Block";
	this.drumNames[77] = "Low Wood Block";
	this.drumNames[78] = "Mute Cuica";
	this.drumNames[79] = "Open Cuica";
	this.drumNames[80] = "Mute Triangle";
	this.drumNames[81] = "Open Triangle";

	this.insNames = [];
	this.insNames[0] = "Acoustic Grand Piano: Piano";
	this.insNames[1] = "Bright Acoustic Piano: Piano";
	this.insNames[2] = "Electric Grand Piano: Piano";
	this.insNames[3] = "Honky-tonk Piano: Piano";
	this.insNames[4] = "Electric Piano 1: Piano";
	this.insNames[5] = "Electric Piano 2: Piano";
	this.insNames[6] = "Harpsichord: Piano";
	this.insNames[7] = "Clavinet: Piano";
	this.insNames[8] = "Celesta: Chromatic Percussion";
	this.insNames[9] = "Glockenspiel: Chromatic Percussion";
	this.insNames[10] = "Music Box: Chromatic Percussion";
	this.insNames[11] = "Vibraphone: Chromatic Percussion";
	this.insNames[12] = "Marimba: Chromatic Percussion";
	this.insNames[13] = "Xylophone: Chromatic Percussion";
	this.insNames[14] = "Tubular Bells: Chromatic Percussion";
	this.insNames[15] = "Dulcimer: Chromatic Percussion";
	this.insNames[16] = "Drawbar Organ: Organ";
	this.insNames[17] = "Percussive Organ: Organ";
	this.insNames[18] = "Rock Organ: Organ";
	this.insNames[19] = "Church Organ: Organ";
	this.insNames[20] = "Reed Organ: Organ";
	this.insNames[21] = "Accordion: Organ";
	this.insNames[22] = "Harmonica: Organ";
	this.insNames[23] = "Tango Accordion: Organ";
	this.insNames[24] = "Acoustic Guitar (nylon): Guitar";
	this.insNames[25] = "Acoustic Guitar (steel): Guitar";
	this.insNames[26] = "Electric Guitar (jazz): Guitar";
	this.insNames[27] = "Electric Guitar (clean): Guitar";
	this.insNames[28] = "Electric Guitar (muted): Guitar";
	this.insNames[29] = "Overdriven Guitar: Guitar";
	this.insNames[30] = "Distortion Guitar: Guitar";
	this.insNames[31] = "Guitar Harmonics: Guitar";
	this.insNames[32] = "Acoustic Bass: Bass";
	this.insNames[33] = "Electric Bass (finger): Bass";
	this.insNames[34] = "Electric Bass (pick): Bass";
	this.insNames[35] = "Fretless Bass: Bass";
	this.insNames[36] = "Slap Bass 1: Bass";
	this.insNames[37] = "Slap Bass 2: Bass";
	this.insNames[38] = "Synth Bass 1: Bass";
	this.insNames[39] = "Synth Bass 2: Bass";
	this.insNames[40] = "Violin: Strings";
	this.insNames[41] = "Viola: Strings";
	this.insNames[42] = "Cello: Strings";
	this.insNames[43] = "Contrabass: Strings";
	this.insNames[44] = "Tremolo Strings: Strings";
	this.insNames[45] = "Pizzicato Strings: Strings";
	this.insNames[46] = "Orchestral Harp: Strings";
	this.insNames[47] = "Timpani: Strings";
	this.insNames[48] = "String Ensemble 1: Ensemble";
	this.insNames[49] = "String Ensemble 2: Ensemble";
	this.insNames[50] = "Synth Strings 1: Ensemble";
	this.insNames[51] = "Synth Strings 2: Ensemble";
	this.insNames[52] = "Choir Aahs: Ensemble";
	this.insNames[53] = "Voice Oohs: Ensemble";
	this.insNames[54] = "Synth Choir: Ensemble";
	this.insNames[55] = "Orchestra Hit: Ensemble";
	this.insNames[56] = "Trumpet: Brass";
	this.insNames[57] = "Trombone: Brass";
	this.insNames[58] = "Tuba: Brass";
	this.insNames[59] = "Muted Trumpet: Brass";
	this.insNames[60] = "French Horn: Brass";
	this.insNames[61] = "Brass Section: Brass";
	this.insNames[62] = "Synth Brass 1: Brass";
	this.insNames[63] = "Synth Brass 2: Brass";
	this.insNames[64] = "Soprano Sax: Reed";
	this.insNames[65] = "Alto Sax: Reed";
	this.insNames[66] = "Tenor Sax: Reed";
	this.insNames[67] = "Baritone Sax: Reed";
	this.insNames[68] = "Oboe: Reed";
	this.insNames[69] = "English Horn: Reed";
	this.insNames[70] = "Bassoon: Reed";
	this.insNames[71] = "Clarinet: Reed";
	this.insNames[72] = "Piccolo: Pipe";
	this.insNames[73] = "Flute: Pipe";
	this.insNames[74] = "Recorder: Pipe";
	this.insNames[75] = "Pan Flute: Pipe";
	this.insNames[76] = "Blown bottle: Pipe";
	this.insNames[77] = "Shakuhachi: Pipe";
	this.insNames[78] = "Whistle: Pipe";
	this.insNames[79] = "Ocarina: Pipe";
	this.insNames[80] = "Lead 1 (square): Synth Lead";
	this.insNames[81] = "Lead 2 (sawtooth): Synth Lead";
	this.insNames[82] = "Lead 3 (calliope): Synth Lead";
	this.insNames[83] = "Lead 4 (chiff): Synth Lead";
	this.insNames[84] = "Lead 5 (charang): Synth Lead";
	this.insNames[85] = "Lead 6 (voice): Synth Lead";
	this.insNames[86] = "Lead 7 (fifths): Synth Lead";
	this.insNames[87] = "Lead 8 (bass + lead): Synth Lead";
	this.insNames[88] = "Pad 1 (new age): Synth Pad";
	this.insNames[89] = "Pad 2 (warm): Synth Pad";
	this.insNames[90] = "Pad 3 (polysynth): Synth Pad";
	this.insNames[91] = "Pad 4 (choir): Synth Pad";
	this.insNames[92] = "Pad 5 (bowed): Synth Pad";
	this.insNames[93] = "Pad 6 (metallic): Synth Pad";
	this.insNames[94] = "Pad 7 (halo): Synth Pad";
	this.insNames[95] = "Pad 8 (sweep): Synth Pad";
	this.insNames[96] = "FX 1 (rain): Synth Effects";
	this.insNames[97] = "FX 2 (soundtrack): Synth Effects";
	this.insNames[98] = "FX 3 (crystal): Synth Effects";
	this.insNames[99] = "FX 4 (atmosphere): Synth Effects";
	this.insNames[100] = "FX 5 (brightness): Synth Effects";
	this.insNames[101] = "FX 6 (goblins): Synth Effects";
	this.insNames[102] = "FX 7 (echoes): Synth Effects";
	this.insNames[103] = "FX 8 (sci-fi): Synth Effects";
	this.insNames[104] = "Sitar: Ethnic";
	this.insNames[105] = "Banjo: Ethnic";
	this.insNames[106] = "Shamisen: Ethnic";
	this.insNames[107] = "Koto: Ethnic";
	this.insNames[108] = "Kalimba: Ethnic";
	this.insNames[109] = "Bagpipe: Ethnic";
	this.insNames[110] = "Fiddle: Ethnic";
	this.insNames[111] = "Shanai: Ethnic";
	this.insNames[112] = "Tinkle Bell: Percussive";
	this.insNames[113] = "Agogo: Percussive";
	this.insNames[114] = "Steel Drums: Percussive";
	this.insNames[115] = "Woodblock: Percussive";
	this.insNames[116] = "Taiko Drum: Percussive";
	this.insNames[117] = "Melodic Tom: Percussive";
	this.insNames[118] = "Synth Drum: Percussive";
	this.insNames[119] = "Reverse Cymbal: Percussive";
	this.insNames[120] = "Guitar Fret Noise: Sound effects";
	this.insNames[121] = "Breath Noise: Sound effects";
	this.insNames[122] = "Seashore: Sound effects";
	this.insNames[123] = "Bird Tweet: Sound effects";
	this.insNames[124] = "Telephone Ring: Sound effects";
	this.insNames[125] = "Helicopter: Sound effects";
	this.insNames[126] = "Applause: Sound effects";
	this.insNames[127] = "Gunshot: Sound effects";
	this.iconSample = function (context, x, y) {
		context.lineWidth = 2;
		context.beginPath();
		context.moveTo(x + 0.1 * tapSize, y + 0.5 * tapSize);
		context.lineTo(x + 0.2 * tapSize, y + 0.4 * tapSize);
		context.lineTo(x + 0.3 * tapSize, y + 0.7 * tapSize);
		context.lineTo(x + 0.4 * tapSize, y + 0.2 * tapSize);
		context.lineTo(x + 0.5 * tapSize, y + 0.9 * tapSize);
		context.lineTo(x + 0.6 * tapSize, y + 0.1 * tapSize);
		context.lineTo(x + 0.7 * tapSize, y + 0.6 * tapSize);
		context.lineTo(x + 0.8 * tapSize, y + 0.4 * tapSize);
		context.lineTo(x + 0.9 * tapSize, y + 0.5 * tapSize);
		context.strokeStyle = "rgba(255,255,255,0.5)";
		context.stroke();
		context.lineWidth = 1;
	};
	this.iconRiffs = function (context, x, y) {
		context.lineWidth = 2;
		context.beginPath();
		context.moveTo(x + 0.1 * tapSize, y + 0.6 * tapSize);
		context.lineTo(x + 0.4 * tapSize, y + 0.3 * tapSize);
		context.lineTo(x + 0.7 * tapSize, y + 0.3 * tapSize);

		context.moveTo(x + 0.2 * tapSize, y + 0.7 * tapSize);
		context.lineTo(x + 0.4 * tapSize, y + 0.5 * tapSize);
		context.lineTo(x + 0.8 * tapSize, y + 0.5 * tapSize);

		context.strokeStyle = "rgba(255,255,255,0.5)";
		context.stroke();
		context.lineWidth = 1;
	};
	this.iconSongs = function (context, x, y) {
		context.lineWidth = 2;
		context.beginPath();
		context.moveTo(x + 0.25 * tapSize, y + 0.25 * tapSize);
		context.lineTo(x + 0.45 * tapSize, y + 0.25 * tapSize);
		context.lineTo(x + 0.45 * tapSize, y + 0.45 * tapSize);
		context.lineTo(x + 0.25 * tapSize, y + 0.45 * tapSize);
		context.lineTo(x + 0.25 * tapSize, y + 0.25 * tapSize);

		context.moveTo(x + 0.55 * tapSize, y + 0.25 * tapSize);
		context.lineTo(x + 0.75 * tapSize, y + 0.25 * tapSize);
		context.lineTo(x + 0.75 * tapSize, y + 0.45 * tapSize);
		context.lineTo(x + 0.55 * tapSize, y + 0.45 * tapSize);
		context.lineTo(x + 0.55 * tapSize, y + 0.25 * tapSize);

		context.moveTo(x + 0.25 * tapSize, y + 0.55 * tapSize);
		context.lineTo(x + 0.45 * tapSize, y + 0.55 * tapSize);
		context.lineTo(x + 0.45 * tapSize, y + 0.75 * tapSize);
		context.lineTo(x + 0.25 * tapSize, y + 0.75 * tapSize);
		context.lineTo(x + 0.25 * tapSize, y + 0.55 * tapSize);

		context.moveTo(x + 0.55 * tapSize, y + 0.55 * tapSize);
		context.lineTo(x + 0.75 * tapSize, y + 0.55 * tapSize);
		context.lineTo(x + 0.75 * tapSize, y + 0.75 * tapSize);
		context.lineTo(x + 0.55 * tapSize, y + 0.75 * tapSize);
		context.lineTo(x + 0.55 * tapSize, y + 0.55 * tapSize);

		context.strokeStyle = "rgba(255,255,255,0.5)";
		context.stroke();
		context.lineWidth = 1;
	};

	this.iconMenu = function (context, x, y) {
		context.lineWidth = 2;
		context.beginPath();

		context.moveTo(x + 0.2 * tapSize, y + 0.3 * tapSize);
		context.lineTo(x + 0.8 * tapSize, y + 0.3 * tapSize);

		context.moveTo(x + 0.2 * tapSize, y + 0.4 * tapSize);
		context.lineTo(x + 0.8 * tapSize, y + 0.4 * tapSize);

		context.moveTo(x + 0.2 * tapSize, y + 0.5 * tapSize);
		context.lineTo(x + 0.8 * tapSize, y + 0.5 * tapSize);

		context.moveTo(x + 0.2 * tapSize, y + 0.6 * tapSize);
		context.lineTo(x + 0.8 * tapSize, y + 0.6 * tapSize);

		context.moveTo(x + 0.2 * tapSize, y + 0.7 * tapSize);
		context.lineTo(x + 0.8 * tapSize, y + 0.7 * tapSize);

		context.strokeStyle = "rgba(255,255,255,0.5)";
		context.stroke();
		context.lineWidth = 1;
	};
	this.iconUp = function (context, x, y) {
		context.lineWidth = 2;
		context.beginPath();
		context.moveTo(x + 0.2 * tapSize, y + 0.4 * tapSize);
		context.lineTo(x + 0.5 * tapSize, y + 0.15 * tapSize);
		context.lineTo(x + 0.8 * tapSize, y + 0.4 * tapSize);
		context.strokeStyle = "rgba(255,255,255,0.5)";
		context.stroke();
		context.lineWidth = 1;
	};
	this.iconFolder = function (context, x, y) {
		context.lineWidth = 2;
		context.beginPath();
		context.moveTo(x + 0.2 * tapSize, y + 0.3 * tapSize);
		context.lineTo(x + 0.8 * tapSize, y + 0.3 * tapSize);
		context.lineTo(x + 0.8 * tapSize, y + 0.7 * tapSize);
		context.lineTo(x + 0.2 * tapSize, y + 0.7 * tapSize);
		context.lineTo(x + 0.2 * tapSize, y + 0.2 * tapSize);
		context.lineTo(x + 0.5 * tapSize, y + 0.2 * tapSize);
		context.lineTo(x + 0.6 * tapSize, y + 0.3 * tapSize);
		context.strokeStyle = "rgba(255,255,255,0.5)";
		context.stroke();
		context.lineWidth = 1;
	};
	this.iconSpeaker = function (context, x, y) {
		context.lineWidth = 2;
		context.beginPath();
		context.moveTo(x + 0.4 * tapSize, y + 0.4 * tapSize);
		context.lineTo(x + 0.3 * tapSize, y + 0.4 * tapSize);
		context.lineTo(x + 0.3 * tapSize, y + 0.6 * tapSize);
		context.lineTo(x + 0.4 * tapSize, y + 0.6 * tapSize);
		context.lineTo(x + 0.4 * tapSize, y + 0.4 * tapSize);
		context.lineTo(x + 0.7 * tapSize, y + 0.2 * tapSize);
		context.lineTo(x + 0.7 * tapSize, y + 0.8 * tapSize);
		context.lineTo(x + 0.4 * tapSize, y + 0.6 * tapSize);
		context.lineTo(x + 0.4 * tapSize, y + 0.4 * tapSize);
		context.strokeStyle = "rgba(255,255,255,0.5)";
		context.stroke();
		context.lineWidth = 1;
	};
	this.iconCircle = function (context, x, y) {
		context.lineWidth = 1;
		context.beginPath();
		context.arc(x + tapSize / 2, y + tapSize / 2, tapSize / 6, 0, Math.PI * 2);
		context.strokeStyle = "rgba(255,255,255,0.2)";
		context.stroke();
		context.lineWidth = 1;
	};
	this.iconPlayStop = function (context, x, y) {
		context.lineWidth = 1;
		context.beginPath();
		context.arc(x + tapSize / 2, y + tapSize / 2, tapSize / 3, 0, Math.PI * 2);
		context.moveTo(x + tapSize *0.45, y + tapSize *0.3);
		context.lineTo(x + tapSize *0.45, y + tapSize *0.7);
		context.moveTo(x + tapSize *0.55, y + tapSize *0.3);
		context.lineTo(x + tapSize *0.55, y + tapSize *0.7);
		context.strokeStyle = "rgba(255,255,255,0.5)";
		context.stroke();
		context.closePath();
		context.lineWidth = 1;
	};
	this.iconPlayStart = function (context, x, y) {
		context.lineWidth = 1;
		context.beginPath();
		context.arc(x + tapSize / 2, y + tapSize / 2, tapSize / 3, 0, Math.PI * 2);
		context.moveTo(x + tapSize *0.4, y + tapSize *0.3);
		context.lineTo(x + tapSize *0.4, y + tapSize *0.7);
		context.lineTo(x + tapSize *0.7, y + tapSize *0.5);
		context.lineTo(x + tapSize *0.4, y + tapSize *0.3);
		context.fillStyle = "rgba(255,255,255,0.7)";
		context.fill();
		context.closePath();
		context.lineWidth = 1;
	};	
	this.drawSwitch = function (context, x, y, n, max) {
		var sz = 0.35 * tapSize / (max + 1);
		var full = Math.PI * 2;
		var count = max + 1;
		context.lineWidth = 1;
		context.fillStyle = "#666666";
		context.beginPath();
		context.moveTo(x + tapSize / 2, y + tapSize / 2);
		context.arc(x + tapSize / 2, y + tapSize / 2, tapSize / 3, 0, full);
		context.lineTo(x + tapSize / 2, y + tapSize / 2);
		context.fill();
		context.closePath();
		context.strokeStyle = "#000000";
		context.fillStyle = "#cccccc";

		context.beginPath();
		context.moveTo(x + tapSize / 2, y + tapSize / 2);
		context.arc(x + tapSize / 2, y + tapSize / 2, tapSize / 3, 0, ((1 + n) / count) * full);
		context.lineTo(x + tapSize / 2, y + tapSize / 2);
		context.fill();
		context.closePath();
		for (var i = 0; i < count; i++) {
			context.beginPath();
			context.moveTo(x + tapSize / 2, y + tapSize / 2);
			context.arc(x + tapSize / 2, y + tapSize / 2, tapSize / 3, (i / count) * full, ((1 + i) / count) * full);
			context.lineTo(x + tapSize / 2, y + tapSize / 2);
			context.stroke();
			context.closePath();
		}

		context.lineWidth = 1;
	};
	this.dumpBeat = function (b, bb) {
		console.log("				point: " + b + "/" + bb.length);
		for (var d = 0; d < bb.length; d++) {
			var dd = bb[d];
			console.log("					drum: " + dd.sampleId);
		}
	};
	this.dumpTune = function (tt) {
		console.log("			tune: " + tt.sampleId);
		for (var s = 0; s < tt.steps.length; s++) {
			var chord = tt.steps[s];
			console.log("				step: " + s);
			for (var h = 0; h < chord.length; h++) {
				var point = chord[h];
				console.log("					dot: " + point.pitch + "/" + point.length
					 + "/" + point.shift);
			}
		}
	};
	this.dumpRiff = function (rr) {
		console.log("		riff " + rr.id + ": ",  + rr);
		//console.log("rr.beat",rr.beat);
		for (var b = 0; b < rr.beat.length; b++) {
			var bb = rr.beat[b];
			me.dumpBeat(b, bb);
		}
		for (var t = 0; t < rr.tunes.length; t++) {
			var tt = rr.tunes[t];
			me.dumpTune(tt);
		}
	};
	this.dumpPosition = function (pp, song) {
		//console.log(" position " + pp.left + "x" + pp.top);
		//console.log(pp.riffIds);
		for (var r = 0; r < pp.riffIds.length; r++) {
			var rr = pp.riffIds[r];
			var rf = me.findRiffById(rr, song);
			me.dumpRiff(rf);
		}
	};
	this.dumpSong = function (song) {
		console.log("comment: " + song.comment);
		console.log("riffs: " + song.riffs.length);
		for (var p = 0; p < song.positions.length; p++) {
			var pp = song.positions[p];
			//console.log(" position " + pp.left + "x" + pp.top);
			me.dumpPosition(pp, song);
		}
	};
	this.existsRiffInSong = function (riff, song) {
		for (var i = 0; i < song.riffs.length; i++) {
			if (riff.id == song.riffs[i].id) {
				return true;
			}
		}
		return false;
	};
	this.existsPositionInSong = function (left, top, song) {
		for (var i = 0; i < song.positions.length; i++) {
			if (left == song.positions[i].left && top == song.positions[i].top) {
				return true;
			}
		}
		return false;
	};
	this.existsSampleIdInSong = function (id, song) {
		for (var i = 0; i < song.samples.length; i++) {
			if (id == song.samples[i].id) {
				return true;
			}
		}
		return false;
	};
	this.existsSamplePathInSong = function (path, song) {
		for (var i = 0; i < song.samples.length; i++) {
			if (path == song.samples[i].path) {
				return true;
			}
		}
		return false;
	};
	this.existsInstrumentIdInRiff = function (id, riff) {
		if(riff!=null){
		if(riff.tunes){
			for (var i = 0; i < riff.tunes.length; i++) {
				if (riff.tunes[i].sampleId == id) {
					return true;
				}
			}
		}}
		return false;
	};
	this.existsBeatIdInRiff = function (id, riff) {
		if(riff!=null){
			if(riff.beat){
			for (var i = 0; i < riff.beat.length; i++) {
				//console.log(id+" - "+riff.beat[i]);
				var chord = riff.beat[i];
				for (var n = 0; n < chord.length; n++) {
					if (chord[n].sampleId == id) {
						return true;
					}
				}
			}}
		}
		return false;
	};
	this.existsSampleIdInRiff = function (id, riff) {
		if(riff!=null){
			if (me.existsInstrumentIdInRiff(id, riff)) {
				return true;
			}
			if (me.existsBeatIdInRiff(id, riff)) {
				return true;
			}
		}
		return false;
	};
	this.existsSampleIdInPosition = function (id, position, song) {
		//onsole.log(position);
		for (var i = 0; i < position.riffIds.length; i++) {
			//console.log(position.riffIds[i]);
			//console.log(position.riffIds[i].id);
			var riff = me.findRiffById(position.riffIds[i], song);
			if (me.existsSampleIdInRiff(id, riff)) {
				return true;
			}
		}
		return false;
	};

	this.existsRiffIdInPosition = function (riffId, position) {
		//console.log(riffId,position.riffIds);
		for (var i = 0; i < position.riffIds.length; i++) {
			//console.log(position.riffIds[i]);
			if (riffId == position.riffIds[i]) {
				return true;
			}
		}
		return false;
	};
	this.existsTuneInRiff = function (tune, riff) {
		for (var i = 0; i < riff.tunes.length; i++) {
			if (tune.sampleId == riff.tunes[i].sampleId) {
				return true;
			}
		}
		return false;
	};
	this.replaceSampleIdForRiff = function (songRiff, oldId, newId) {
		console.log("replaceSampleIdForRiff", oldId, newId);
		for (var s = 0; s < songRiff.beat.length; s++) {
			var chord = songRiff.beat[s];
			for (var i = 0; i < chord.length; i++) {
				var songRiffBeatPoint = chord[i];
				if (songRiffBeatPoint.sampleId == oldId) {
					songRiffBeatPoint.sampleId = newId;
				}
			}
		}
		for (var t = 0; t < songRiff.tunes.length; t++) {
			var songRiffTune = songRiff.tunes[t];
			if (songRiffTune.sampleId == oldId) {
				console.log("replace id", oldId, newId);
				songRiffTune.sampleId = newId;
			}
		}
	};
	this.mergeRiff = function (riff, fromSong, toSong) {

		//toolbox.dumpRiff("fromSong.samples",fromSong.samples);
		for (var i = 0; i < fromSong.samples.length; i++) {
			var oldSample = fromSong.samples[i];
			toolbox.replaceSampleIdForRiff(riff, oldSample.id, oldSample.reId);
		}
		riff.id = randomKey();
		toolbox.addRiffToSong(riff, toSong);
		//toolbox.dumpRiff("fromSong.samples",fromSong.samples);
	};
	this.mergeSamples = function (fromSong, toSong) {
		console.log("mergeSamples");
		for (var i = 0; i < fromSong.samples.length; i++) {
			var oldSample = fromSong.samples[i];
			var newSample = toolbox.addSampleToSong(oldSample.path, toSong);
			//console.log(oldSample);
			oldSample.reId = newSample.id;
			//console.log(oldSample);
		}
		for (var i = 0; i < toSong.samples.length; i++) {
			console.log(toSong.samples[i]);
		}
	};
	this.addRiffToSong = function (riff, song) {
		if (!this.existsRiffInSong(riff, song)) {
			song.riffs[song.riffs.length] = riff;
			riff.songId = song.id;
		}
	};
	this.dropRiffFromSong = function (riff, song) {
		for (var i = 0; i < song.riffs.length; i++) {
			if (riff.id == song.riffs[i].id) {
				song.riffs.splice(i, 1);
				//console.log("dropRiffFromSong",song.riffs.length,sampleId);
				return true;
			}
		}
		return false;
	};
	this.findSampleById = function (sampleId, song) {
		//console.log(sampleId);
		for (var i = 0; i < song.samples.length; i++) {
			// console.log(song.samples[i]);
			if (sampleId == song.samples[i].id) {
				return song.samples[i];
			}
		}
	};
	this.findSampleByPath = function (path, song) {
		//console.log(path);
		for (var i = 0; i < song.samples.length; i++) {
			// console.log(song.samples[i]);
			if (path == song.samples[i].path) {
				return song.samples[i];
			}
		}
		return null;
	};
	this.addSampleToSong = function (path, song) {

		if (!this.existsSamplePathInSong(path, song)) {
			var sample = new SongSample();
			sample.path = path;
			song.samples[song.samples.length] = sample;
			me.adjustSample(sample);
			//console.log("addSampleToSong ", sample);
			return sample;
		} else {
			//console.log("not addSampleToSong " + path);
			return me.findSampleByPath(path, song);
		}
	};
	this.findRiffById = function (riffId, song) {
		//console.log(riffId);
		if(song.riffs){
		for (var i = 0; i < song.riffs.length; i++) {
			//console.log(song.riffs[i].id);
			if (song.riffs[i].id == riffId) {
				return song.riffs[i];
			}
		}}
		console.log("not found riff " + riffId);
	};
	this.addRiffIdToPosition = function (riffId, position) {
		if (!this.existsRiffIdInPosition(riffId, position)) {
			position.riffIds[position.riffIds.length] = riffId;
		}
	};
	this.getTuneBySampleId = function (sampleId, songRiff) {
		for (var i = 0; i < songRiff.tunes.length; i++) {
			var songRiffTune = songRiff.tunes[i];
			if (songRiffTune.sampleId == sampleId) {
				return songRiffTune;
			}
		}
		var t = new SongRiffTune();
		t.sampleId = sampleId;
		me.addTuneToRiff(t, songRiff);
		return t;
	};
	this.addTuneToRiff = function (tune, riff) {
		if (!this.existsTuneInRiff(tune, riff)) {
			riff.tunes[riff.tunes.length] = tune;
		}
	};
	this.getPositionFromSong = function (left, top, song) {
		//console.log('getPositionFromSong',left, top);
		if (!this.existsPositionInSong(left, top, song)) {
			var p = new SongPosition();
			p.left = left;
			p.top = top;
			song.positions[song.positions.length] = p;
			return p;
		}
		for (var i = 0; i < song.positions.length; i++) {
			if (left == song.positions[i].left && top == song.positions[i].top) {
				return song.positions[i];
			}
		}
	};
	this.adjustArrayOfArray = function (arr, to) {
		for (var i = arr.length; i <= to; i++) {
			arr[i] = [];
		}
	};
	this.existsTunePointAtTune = function (step, pitch, tune) {
		me.adjustArrayOfArray(tune.steps, step);
		var chord = tune.steps[step];
		if(!chord){
			chord=[];
			tune.steps[step]=chord;
		}
		for (var i = 0; i < chord.length; i++) {
			if (chord[i].pitch == pitch) {
				return true;
			}
		}
		return false;
	};
	this.removeTuneIfEmpty = function (riff, tune) {
		for (var t = 0; t < riff.tunes.length; t++) {
			var songRiffTune = riff.tunes[t];
			if (songRiffTune.id == tune.id) {
				for (var s = 0; s < songRiffTune.steps.length; s++) {
					if (songRiffTune.steps[s].length > 0) {
						return;
					}
				}
				//console.log("removeTuneIfEmpty");
				riff.tunes.splice(t, 1);
				return;
			}
		}
	};
	this.removeTunePointFromTune = function (riff, step, pitch, tune) {
		me.adjustArrayOfArray(tune.steps, step);
		var chord = tune.steps[step];
		for (var i = 0; i < chord.length; i++) {
			if (chord[i].pitch == pitch) {
				chord.splice(i, 1);
				me.removeTuneIfEmpty(riff, tune);
				return;
			}
		}
	};
	this.setTunePointToTune = function (step, pitch, length, shift, tune) {
		var point = new SongRiffTunePoint();
		point.pitch = pitch;
		point.length = length;
		point.shift = shift;
		me.adjustArrayOfArray(tune.steps, step);
		var chord = tune.steps[step];
		if(!chord){
			chord=[];
			tune.steps[step]=chord;
		}
		for (var i = 0; i < chord.length; i++) {
			if (chord[i].pitch == pitch) {
				chord[i] = point;
				return;
			}
		}
		chord[chord.length] = point;
	};
	this.setBeatPointToRiff = function (step, sampleId, riff) {
		var point = new SongRiffBeatPoint();
		point.sampleId = sampleId;
		me.adjustArrayOfArray(riff.beat, step);
		var chord = riff.beat[step];
		for (var i = 0; i < chord.length; i++) {
			if (chord[i].sampleId == sampleId) {
				return;
			}
		}
		chord[chord.length] = point;
	};
	this.existsBeatPointAtRiff = function (step, sampleId, riff) {
		me.adjustArrayOfArray(riff.beat, step);
		var chord = riff.beat[step];
		if(!chord){
			chord=[];
			riff.beat[step]=chord;
		}
		for (var i = 0; i < chord.length; i++) {
			if (chord[i].sampleId == sampleId) {
				return true;
			}
		}
		return false;
	};
	this.removeBeatPointFromRiff = function (step, sampleId, riff) {
		me.adjustArrayOfArray(riff.beat, step);
		var chord = riff.beat[step];
		for (var i = 0; i < chord.length; i++) {
			if (chord[i].sampleId == sampleId) {
				chord.splice(i, 1);
				return;
			}
		}
	};
	this.calculatePitchColor = function (pitch, sample) {
		//console.log(sample);
		if (sample === undefined) {
			console.log("sample===undefined");
			return "#999999";
		}
		if (app.song.colorMode > 0) {
			var nn = (pitch - app.song.colorMode) % 12 - 11;
			//console.log(nn );
			if (nn < 0) {
				nn = nn + 12;
			}
			if (nn > 11) {
				nn = nn - 12;
			}
			//(pitch-app.song.colorMode+12 - 1) % 12;
			//console.log(pitch + "->" + nn + ": " + me.colorizer[nn]);
			return me.colorizer[nn];
		} else {
			return sample.color;
		}
	}
	this.calculateColor = function (path, midi) {
		try {

			var color = "#ffffff";
			var s = path.split("/");

			var n = s[s.length - 1].charCodeAt(0);
			n = n + s[s.length - 1].charCodeAt(1);
			n = n + s[s.length - 1].charCodeAt(2);
			n = n + midi;
			//console.log(n+": "+midi+": "+path);
			n = n % 24;
			if (n == 0)
				color = '#ffff99';
			else if (n == 1)
				color = '#ffff33';
			else if (n == 2)
				color = '#ff99ff';
			else if (n == 3)
				color = '#ff9999';
			else if (n == 4)
				color = '#ff9933';
			else if (n == 5)
				color = '#ff33ff';
			else if (n == 6)
				color = '#ff3399';
			else if (n == 7)
				color = '#ff3333';
			else if (n == 8)
				color = '#99ffff';
			else if (n == 9)
				color = '#99ff99';
			else if (n == 10)
				color = '#99ff33';
			else if (n == 11)
				color = '#9999ff';
			else if (n == 12)
				color = '#999933';
			else if (n == 13)
				color = '#9933ff';
			else if (n == 14)
				color = '#993399';
			else if (n == 15)
				color = '#993333';
			else if (n == 16)
				color = '#33ffff';
			else if (n == 17)
				color = '#33ff99';
			else if (n == 18)
				color = '#33ff33';
			else if (n == 19)
				color = '#3399ff';
			else if (n == 20)
				color = '#339999';
			else if (n == 21)
				color = '#339933';
			else if (n == 22)
				color = '#3333ff';
			else
				color = '#333399';

		} catch (e) {
			console.log(path + " / " + midi);
			console.log("calculateColor:");
			console.log(e);
		}
		return color;
	};
	this.adjustSamples = function (song) {
		//console.log("adjustSamples");
		me.adjustSong(app.song);
		if(song.samples){
			for (var i = 0; i < song.samples.length; i++) {
				me.adjustSample(song.samples[i]);
			}
			me.sortSamples(song);
		}
	};
	this.adjustSample = function (sample) {
		//console.log("adjustSample "+sample.path);
		//console.log(sample);
		try {

			/*if (sample.path.indexOf("drum") > -1) {
			sample.isDrum = true;
			} else {
			sample.isDrum = false;
			}*/
			/*if (sample.isDrum) {
			sample.color = "#ffffff";
			} else {
			sample.color = me.calculateColor(sample.path, sample.midi);
			}*/
			//console.log(sample.path);
			//sample.path = path;
			// console.log("reset:
			// "+id);//http://javafx.me/sf/instruments/000/SynthGMS_000/003_067-076_60_-8300_15428-25212_44100
			// http://javafx.me/sf/instruments/000/SynthGMS_000/003_067-076_60_-8300_15428-25212_44100
			var p1 = sample.path.split("/");
			//console.log("p1: "+p1);
			var p2 = p1[p1.length - 1]; //004_030-030_60_-4200_7-3567_44100
			//console.log("p2: "+p2);
			var parts = p2.split("_"); //["004", "030-030", "60", "-4200", "7-3567", "44100"]
			//                              0        1      2       3        4         5
			//console.log(parts);
			var pitchParts = parts[1].split("-");
			//console.log("pitchParts:");
			//console.log(pitchParts);
			sample.pitchStart = 1.0 * (pitchParts[0]);

			sample.pitchEnd = 1.0 * pitchParts[1];
			// console.log("pitch: "+p4[0]+" -> "+p4[1]);
			// console.log("base: "+p3[2]);
			// console.log("correction: "+p3[3]);

			var loopParts = parts[4].split("-");
			//console.log("loop: "+loopParts[0]+" -> "+loopParts[1]);
			// console.log("frequency: "+p3[5]);
			if (loopParts[0] < 10) {
				sample.loopStart = 0;
				sample.loopEnd = 0;
			} else {
				sample.loopStart = 1.0 * loopParts[0];
				sample.loopEnd = 1.0 * loopParts[1];
			}
			sample.basePitch = 1.0 * parts[2];
			sample.correction = 1.0 * parts[3];
			sample.sampleRate = 1.0 * parts[5];
			if (sample.path.indexOf("/drums/") > -1) {
				sample.isDrum = true;
			} else {
				sample.isDrum = false;
			}
			if (sample.isDrum) {
				var midiPart = parts[1].split("-");
				sample.midi = 1.0 * midiPart[0];
				sample.correction = -4000;
				sample.color = "#ffffff";
				if(sample.path.indexOf("SynthGMS_128") > -1){
					sample.sampleRate=22050;
				}
			} else {
				sample.midi = 1.0 * p1[p1.length - 3];
				sample.color = me.calculateColor(sample.path, sample.midi);
				sample.color = me.calculateColor(sample.path, sample.midi);
			}

		} catch (e) {
			console.log("adjustSample error: ");
			console.log(e);
			console.log(sample);

		}
		//console.log(sample);
	};
	this.clearPosition = function (left, top) {
		for (var i = 0; i < app.song.positions.length; i++) {
			if (app.song.positions[i].left == left && app.song.positions[i].top == top) {
				console.log("clearPosition", app.song.positions[i]);
				app.position = null;
				app.song.positions.splice(i, 1);
				return;
			}
		}
	};
	this.findPosition = function (id, song, doNotThrow) {
		if(song.positions){
			for (var i = 0; i < song.positions.length; i++) {
				if (song.positions[i].id == id) {
					return song.positions[i];
				}
			}
		}
		//if (!doNotThrow) {
			//throw "Can't findPosition for '" + id + "'";
		//}
		return null;
	};
	this.findOrCreatePositionXY = function (song, left, top) {
		for (var i = 0; i < song.positions.length; i++) {
			if (song.positions[i].left == left && song.positions[i].top == top) {
				return song.positions[i];
			}
		}
		//if (songPosition == null) {
		songPosition = new SongPosition();
		songPosition.left = left;
		songPosition.top = top;
		//}
		return songPosition;
	};
	this.findFirstFilledRow = function (song) {
		var r = 999;
		for (var n = 0; n < song.positions.length; n++) {
			var p = song.positions[n];
			if (p.top < r) {
				r = p.top;
			}
		}
		return r;
	}
	/*this.findFirstPositionInRow = function (song, y) {
	var r = 999;
	var found = null;
	for (var n = 0; n < song.positions.length; n++) {
	var p = song.positions[n];
	if (p.top == y) {
	if (p.left < r) {
	r = p.left;
	found = p;
	}
	}
	}
	return found;
	}
	this.findNextPositionInRow = function (song, x, y) {
	var r = 999;
	var found = null;
	for (var n = 0; n < song.positions.length; n++) {
	var p = song.positions[n];
	if (p.top == y) {
	if (p.left < r && p.left > x) {
	r = p.left;
	found = p;
	}
	}
	}
	return found;
	}*/

	this.existsMoreRows = function (song, y) {
		for (var n = 0; n < song.positions.length; n++) {
			if (song.positions[n].top > y) {
				return true;
			}
		}
		return false;
	}
	this.existsMoreSlotsInRow = function (song, x, y) {
		for (var n = 0; n < song.positions.length; n++) {
			if (song.positions[n].top == y) {
				if (song.positions[n].left > x) {
					return true;
				}
			}
		}
		return false;
	}
	this.nextPosition = function (song, x, y) {
		//console.log(x,y);
		var songPosition = null;
		if (me.existsMoreSlotsInRow(song, x, y)) {
			//console.log("existsMoreSlotsInRow", x, y);
			songPosition = me.findOrCreatePositionXY(song, x + 1, y);
		} else {
			if (me.existsMoreRows(song, y)) {
				//console.log("existsMoreRows", x, y);
				songPosition = me.findOrCreatePositionXY(song, 0, y + 1);
			} else {
				//console.log("jump start", x, y);
				songPosition = me.findOrCreatePositionXY(song, 0, 0);
			}
		}

		/*
		songPosition = me.findNextPositionInRow(song, x, y);
		if (songPosition == null) {
		if (me.existsMoreRows(song, y)) {
		//songPosition = me.findNextPositionInRow(song, -1, y + 1);
		songPosition = me.findPositionByXY(song, 0,y + 1);
		if (songPosition == null) {
		songPosition=new SongPosition();
		songPosition.left=0;
		songPosition.top=y+1;
		}
		} else {
		//songPosition = me.findFirstPositionInRow(song, toolbox.findFirstFilledRow(song));
		var ny=toolbox.findFirstFilledRow(song);
		songPosition = me.findPositionByXY(song, 0,ny);
		if (songPosition == null) {
		songPosition=new SongPosition();
		songPosition.left=0;
		songPosition.top=ny;
		}
		}
		}*/
		return songPosition;
	}
	this.sortSamples = function (song) {
		song.samples.sort(function (s1, s2) {
			var m1 = "" + s1.midi;
			var m2 = "" + s2.midi;
			if (m1.length < 2) {
				m1 = "0" + m1;
			}
			if (m1.length < 3) {
				m1 = "0" + m1;
			}

			if (m2.length < 2) {
				m2 = "0" + m2;
			}
			if (m2.length < 3) {
				m2 = "0" + m2;
			}
			var t1 = "/" + s1.isDrum + m1 + s1.path;
			var t2 = "/" + s2.isDrum + m2 + s2.path;
			if (t1 > t2) {
				return +1;
			}
			if (t1 < t2) {
				return -1;
			}
			return 0;
			//return s1.midi - s2.midi;
			/*if (s1.isDrum == s2.isDrum) {
			if (s1.midi == s2.midi) {
			return s1.path > s2.path;
			} else {
			return s1.midi > s2.midi;
			}
			} else {
			return s1.isDrum> s1.isDrum;
			}*/
		});
	};
	this.songFromPosition=function(position, song){
		var cuSong = new Song();
		cuSong.tempo=song.tempo;
		cuSong.meter=song.meter;
		cuSong.riffs=song.riffs;
		cuSong.samples=song.samples;
		var cuPosition = new SongPosition();
		cuSong.positions[0]=cuPosition;
		cuPosition.riffIds=position.riffIds;
		cuPosition.left=0;
		cuPosition.top=0;
		return cuSong;
	};
	this.createRiffClone = function (songRiff,song) {
		//console.log("createRiffClone",songRiff,song);
		var newRiff = new SongRiff();
		toolbox.addRiffToSong(newRiff, song);
		newRiff.songId = songRiff.songId;
		newRiff.comment = songRiff.comment;
		for (var s = 0; s < songRiff.beat.length; s++) {
			var chord = songRiff.beat[s];
			for (var i = 0; i < chord.length; i++) {
				var songRiffBeatPoint = chord[i];
				var sampleId = songRiffBeatPoint.sampleId;
				toolbox.setBeatPointToRiff(s, sampleId, newRiff);
			}
		}
		for (var t = 0; t < songRiff.tunes.length; t++) {
			var songRiffTune = songRiff.tunes[t];
			var tune = new SongRiffTune();
			tune.sampleId = songRiffTune.sampleId;
			for (var s = 0; s < songRiffTune.steps.length; s++) {
				var steps = songRiffTune.steps[s];
				for (var p = 0; p < steps.length; p++) {
					var songRiffTunePoint = steps[p];
					toolbox.setTunePointToTune(s, songRiffTunePoint.pitch, songRiffTunePoint.length, songRiffTunePoint.shift, tune);
				}
			}
			toolbox.addTuneToRiff(tune, newRiff);
		}
		return newRiff;
	}
	this.rollRiffForward=function(songRiff){
		var t=songRiff.beat[0];
		for (var s = 0; s < app.song.meter-1; s++) {
			songRiff.beat[s]=songRiff.beat[s+1];
		}
		songRiff.beat[app.song.meter-1]=t;
		for (var t = 0; t < songRiff.tunes.length; t++) {
			var songRiffTune = songRiff.tunes[t];
			var t=songRiffTune.steps[0];
			for (var s = 0; s < app.song.meter-1; s++) {
				songRiffTune.steps[s]=songRiffTune.steps[s+1];
			}
			songRiffTune.steps[app.song.meter-1]=t;
		}
	};
	this.rollRiffBackward=function(songRiff){
		var t=songRiff.beat[app.song.meter-1];
		for (var s = 0; s < app.song.meter-1; s++) {
			songRiff.beat[app.song.meter-1-s]=songRiff.beat[app.song.meter-1-s-1];
		}
		songRiff.beat[0]=t;
		for (var t = 0; t < songRiff.tunes.length; t++) {
			var songRiffTune = songRiff.tunes[t];
			var t=songRiffTune.steps[app.song.meter-1];
			for (var s = 1; s < app.song.meter-1; s++) {
				songRiffTune.steps[app.song.meter-1-s]=songRiffTune.steps[app.song.meter-1-s-1];
			}
			songRiffTune.steps[0]=t;
		}
	};
	this.rollForward=function(position){
		for(var i=0;i<position.riffIds.length;i++){
			var riff = me.findRiffById(position.riffIds[i], app.song);
			this.rollRiffForward(riff);
		}
	};
	this.rollBackward=function(position){
		for(var i=0;i<position.riffIds.length;i++){
			var riff = me.findRiffById(position.riffIds[i], app.song);
			this.rollRiffBackward(riff);
		}
	};
	this.adjustSong=function(song){
		if(!song.positions){
			song.positions=[];
		}
		if(!song.riffs){
			song.riffs=[];
		}
		if(!song.samples){
			song.samples=[];
		}
		if(!(song.tempo==40 || song.tempo==80 || song.tempo==100 || song.tempo==120 || song.tempo==140 || song.tempo==160 || song.tempo==180 || song.tempo==200 || song.tempo==240)){
			song.tempo=120;
		}
		if(!(song.meter==16 || song.meter==24 || song.meter==32 || song.meter==40 || song.meter==48 || song.meter==64)){
			song.meter=32;
		}
		if(!(song.zoom==1 || song.zoom==2 || song.zoom==3)){
			song.zoom=1;
		}
		if(!(song.zoomPosition==1 || song.zoomPosition==2 || song.zoomPosition==3 || song.zoomPosition==4)){
			song.zoomPosition=1;
		}
		if(!song.settingsPanelSongX){
			song.settingsPanelSongX=0;
		}
		if(!song.settingsPanelSongY){
			song.settingsPanelSongY=0;
		}
		if(!song.settingsPanelSongY){
			song.settingsPanelSongY=0;
		}
		
		
		
		if(!song.settingsPanelBeatX){
			song.settingsPanelBeatX=0;
		}
		if(!song.settingsPanelBeatY){
			song.settingsPanelBeatY=0;
		}
		
		
		if(!song.settingsPanelMelodyX){
			song.settingsPanelMelodyX=0;
		}
		if(!song.settingsPanelMelodyY){
			song.settingsPanelMelodyY=0;
		}
		
		if(!song.settingsPanelPositionX){
			song.settingsPanelPositionX=0;
		}
		if(!song.settingsPanelPositionY){
			song.settingsPanelPositionY=0;
		}
	};
	return this;
}
function Vertical() {
    var me = this;
    this.x = 0;
    this.y = 0;
	this.yAnchor=-1;
    this.size = tapSize;
    this.deltaX = 0;
    this.deltaY = 0;
    this.content = null;
    this.highlight = false;
    this.visibled=true;
	this.icon=toolbox.iconCircle;
    this.render = function(context) {
        context.fillStyle = "#ffffff";
        context.fillRect(me.x + me.size / 2, 0, 1, app.renderer.h);
		context.lineWidth = 2;
        context.beginPath();
        context.arc(me.x + me.size / 2, me.y + me.size / 2, me.size / 2, 0, Math.PI * 2);
        if (me.highlight) {
            context.fillStyle = "#333333";
        } else {
            context.fillStyle = "#000000";
        }
        context.strokeStyle = "#ffffff";
        context.fill();
        context.stroke(); 
		context.lineWidth = 1;
		me.icon(context,me.x,me.y);
		//toolbox.iconMenu(context,me.x,me.y);
		/*
        context.strokeStyle = "rgba(255,255,255,0.25)";
        context.beginPath();
        context.moveTo(me.x + 0.4 * me.size, me.y + 0.2 * me.size);
        context.lineTo(me.x + 0.15 * me.size, me.y + 0.5 * me.size);
        context.lineTo(me.x + 0.4 * me.size, me.y + 0.8 * me.size);
        context.stroke();
        context.beginPath();
        context.moveTo(me.x + 0.6 * me.size, me.y + 0.2 * me.size);
        context.lineTo(me.x + 0.85 * me.size, me.y + 0.5 * me.size);
        context.lineTo(me.x + 0.6 * me.size, me.y + 0.8 * me.size);
        context.stroke();
		*/
		
    };
    this.afterTap = function(x, y) {
        me.highlight = false;
        var l = x + me.deltaX;
        if (l < app.renderer.w - tapSize) {
            l = app.renderer.w - tapSize / 2;
        } else {
            l = 0.5 * app.renderer.w;
        }
        me.x = l;
        me.y = y + me.deltaY;
        me.adjustContent();
    };
    this.catchMove = function(x, y) {
        if (me.x < x && x < me.x + me.size) {
            if (me.y < y && y < me.y + me.size) {
                me.deltaX = me.x - x;
                me.deltaY = me.y - y;
                me.highlight = true;
                
                return true;
            }
        }
        return false;
    };
    this.moveTo = function(x, y) {
        me.x = x + me.deltaX;
        me.y = y + me.deltaY;
        me.adjustContent();
    };
    this.endMove = function(x, y) {
        me.highlight = false;
        me.x = x + me.deltaX;
        me.y = y + me.deltaY;
        me.adjustBounds();
        
    };
    this.adjustContent = function() {
        if (me.content != null) {
            me.content.x = me.x + 0.5 * tapSize;
        }
    };
    this.adjustBounds = function() {
        var xx = me.x;
        var yy = me.y;
        if (isNaN(xx)) {
            xx = app.renderer.w / 2;
        }
        if (xx > app.renderer.w - tapSize/2) {
            xx = app.renderer.w - tapSize/2;
        }
        if (xx < 0) {
            xx = 0;
        }
        if (isNaN(yy)) {
            yy = app.renderer.h / 2;
        }
		if(me.yAnchor>-1){
			yy = app.renderer.h- tapSize-me.yAnchor;
		}
        if (yy > app.renderer.h - tapSize ) {
            yy = app.renderer.h - tapSize ;
        }
        if (yy < 0 ) {
            yy = 0 ;
        }
		
        me.x = xx;
        me.y = yy;
        me.adjustContent();
    };
    return me;
}
var app = new App();
var toolbox = new Toolbox();
var lang = new LangEng();
// var version = "3.1.45";
var buildVersion = "3.9.82";
var focused = true;
var backEventListener = null;
var tapSize = 50;
var bgMain=null;
//var bgMenu=null;
//var bgRiffs=null;
//var bgIns=null;
function calcTapSize(n){
	var pixelRatio = window.devicePixelRatio;
	tapSize = 30 * pixelRatio;	
	if (isNaN(tapSize)) {
		tapSize = 51;
	}
	if(n==1){
		tapSize=tapSize*0.7;
	}
	if(n==3){
		tapSize=tapSize*1.5;
	}
};
calcTapSize(2);
if (typeof console == "undefined") {
    window.console = {
        log: function () {
			//
		}
    };
}
function getQueryVariable(name) {
	var query = window.location.search.substring(1);
	query = query.replace("%2F", "/");
	query = query.replace("%2f", "/");
	var vars = query.split("&");
	for (var i = 0; i < vars.length; i++) {
		var pair = vars[i].split("=");
		if (pair[0] == name) {
			return pair[1];
		}
	}
	return "";
}
function unregister() {
	if (backEventListener !== null) {

		document.removeEventListener('tizenhwkey', backEventListener);
		backEventListener = null;
		focused = false;
		app.blur();
		window.tizen.application.getCurrentApplication().exit();
	}
}
function tizenBackButton() {
	unregister();
}
function adjustButton() {
	console.log("adjustButton");
	app.renderer.menuSlot.vertical.x = 0 * tapSize;
	app.renderer.menuSlot.vertical.y = 0 * tapSize;
	app.renderer.menuSlot.vertical.adjustBounds();
	app.renderer.menuSlot.list.x = app.renderer.menuSlot.vertical.x + 0.5 * tapSize;
	//
	app.renderer.menuRiffs.vertical.x = 1 * tapSize;
	app.renderer.menuRiffs.vertical.y = 1 * tapSize;
	app.renderer.menuRiffs.vertical.adjustBounds();
	app.renderer.menuRiffs.list.x = app.renderer.menuRiffs.vertical.x + 0.5 * tapSize;
	//
	app.renderer.menuSamples.vertical.x = 2 * tapSize;
	app.renderer.menuSamples.vertical.y = 2 * tapSize;
	app.renderer.menuSamples.vertical.adjustBounds();
	app.renderer.menuSamples.list.x = app.renderer.menuSamples.vertical.x + 0.5 * tapSize;
	//
	/*
	app.renderer.menuExamples.vertical.x = 3 * tapSize;
	app.renderer.menuExamples.vertical.y = 3 * tapSize;
	app.renderer.menuExamples.vertical.adjustBounds();
	app.renderer.menuExamples.list.x = app.renderer.menuExamples.vertical.x + 0.5 * tapSize;
	 */
	//
	app.renderer.fireRender();
}
function setupTizenKys() {
	console.log("setupTizenKys");
	try {
		if (backEventListener !== null) {
			return;
		}
		var backEvent = function (e) {
			console.log(e.keyName);
			try {
				if (e.keyName == "back") {
					tizenBackButton();
				} else {
					if (e.keyName == "menu") {
						//tizenMenuButton();
						console.log("tizenMenuButton");
					}
				}
			} catch (exptn) {
				console.log(exptn);
			}
		};
		document.addEventListener('tizenhwkey', backEvent);
		backEventListener = backEvent;
	} catch (exptn) {
		console.log(exptn);
	}
}
function setupLoad() {
	console.log("start setupLoad");
	//var t="dyj%22vvv%27hjh%22jh%22f";
	//var re = new RegExp('%22', 'g');
	//t = t.replace(new RegExp('%22', 'g'), '"');
	//t=t.replace("%22", "\"");
	//console.log('t',t);
	var midiLoad = getQueryVariable("midi");
	if (midiLoad.length > 9) {
		console.log("load " + midiLoad);
		app.showSong();
		var parts=midiLoad.split(".");
		var nMeter=64;
		var nTempo=120;
		if(parts.length>3){
			var midiMeter=1*parts[parts.length-2];
			var midiTempo=1*parts[parts.length-3];
			if(midiMeter>0 && midiTempo>0){
				nMeter=midiMeter;
				nTempo=midiTempo;
			}
		}
		console.log("load " + nMeter+"/"+nTempo);
		app.song.tempo=nTempo;
		app.song.meter=nMeter;
		console.log(app.song);
		
		var binaryLoader = new BinaryLoader();
		binaryLoader.load(midiLoad, function () {
			console.log("loaded");
			console.log(binaryLoader.arrayBuffer);
			var arrayBuffer = binaryLoader.arrayBuffer;
			var midiParser = new MidiParser(arrayBuffer);
			midiParser.parse(0, nMeter);
			app.renderer.fireRender();
			//app.playSong(app.song);
			console.log(app.song);
			app.blur();
			//window.open('index.html', '_top');
			window.location.replace('index.html');
		}, function () {
			console.log("error " + binaryLoader.error);
			app.promptWarning("Error: " + binaryLoader.error);
			app.renderer.fireRender();
		});
		
	} else {
		var songLoad = getQueryVariable("song");
		if (songLoad.length > 9) {
			console.log("song " + songLoad);
			app.showSong();
			var binaryLoader = new BinaryLoader();
			binaryLoader.read(songLoad, function () {
				console.log("songLoad");
				console.log(binaryLoader.arrayBuffer);
				var text = binaryLoader.html;
				try{
				var o = JSON.parse(text);
				if (o != null) {
					app.song = o;

					app.renderer.loadSettings(app.song);
					toolbox.adjustSamples(app.song);
					//app.resize();
					//app.playSong(app.song);
					app.blur();
					//window.open('index.html', '_top');
					window.location.replace('index.html');
				}
				}catch(ext){
					console.log(ext);
				}
			}, function () {
				console.log("error " + binaryLoader.error);
				app.promptWarning("Error: " + binaryLoader.error);
				app.renderer.fireRender();
			});
		}else{
			var jsonLoad = getQueryVariable("json");
			if (jsonLoad.length > 1) {
				console.log("json",jsonLoad);
				//jsonLoad=jsonLoad.replace("/%22/g", "\"");
				//jsonLoad=jsonLoad.replace("/%27/g", "\'");
				jsonLoad=jsonLoad.replace(new RegExp('%22', 'g'), "\"");
				jsonLoad=jsonLoad.replace(new RegExp('%27', 'g'), "\'");
				console.log("parse",jsonLoad);
				app.showSong();
				try{
					var o = JSON.parse(jsonLoad);
					if (o != null) {
						app.song = o;
						app.renderer.loadSettings(app.song);
						toolbox.adjustSamples(app.song);
						app.blur();
						window.location.replace('index.html');
					}
				}catch(ext){
					console.log(ext);
				}
			}
		}
	}
}

window.onload = function () {
	console.log("start window.onload");
	bgMain=document.getElementById("bgMain");
	//bgMenu=document.getElementById("bgMenu");
	//bgRiffs=document.getElementById("bgRiffs");
	//bgIns=document.getElementById("bgIns");
	app.init();
	window.onresize = function () {
		app.resize();
	};
	window.onfocus = function () {
		focused = true;
		app.renderer.fireRender();
		//app.focus();
	};
	window.onblur = function () {
		focused = false;
		//stopPlay();

		app.renderer.fireRender();
		//app.blur();
	};
	window.onbeforeunload = function () {
		focused = false;
		app.blur();
	};
	bgMain=document.getElementById("bgMain");
	bgMenu=document.getElementById("bgMenu");
	setupTizenKys();
	//adjustButton();
	renderLoop();
	//console.log(document.getElementById('filesInput'));
	document.getElementById('filesInput').addEventListener('change', importMID, false);
	document.getElementById('filesOpen').addEventListener('change', openSong, false);
	document.getElementById('filesMerge').addEventListener('change', mergeRiffs, false);
	app.promptWarning('loading...');
	setupLoad();
	app.hidePrompt();
	//launchFullScreen(document.documentElement);
	console.log("done window.onload");
	if(isIE()){
		//app.promptWarning("Microsoft Internet Explorer doesn't support WebAudio. Use Chrome/FireFox/Opera/Safari");
		var items = [];
		items[items.length] = new Item("Download Firefox", "", function () {
				window.open("https://www.mozilla.org/en-US/firefox/new/","_self");
			});
		app.promptSelect("Microsoft Internet Explorer doesn't support WebAudio. Use Chrome/FireFox/Opera/Safari", items);
	}
};
window.onbeforeunload = function () {
	app.done();
};
function randomKey() {
	return String(Math.floor(1000000 * Math.random()));
}
function renderLoop() {
	/*if (focused) {
	app.renderer.render();
	}
	window.setTimeout(renderLoop, 40);
	 */
	var ticker = new Ticker(40, app.renderer.render);
	ticker.start();
}
function saveTexToStorage(name, text) {
	try {
		window.localStorage.setItem(name, text);
	} catch (e) {
		console.log("saveTexToStorage: " + name + ": " + e);
	}
}
function readTexFromStorage(name) {
	var text = "?";
	try {
		text = window.localStorage.getItem(name);
	} catch (e) {
		console.log("readTexFromStorage: " + name + ": " + e);
	}
	return text;
}
function readNumFromStorage(name, minValue, defValue, maxValue) {
	var nn = defValue;
	var text = readTexFromStorage(name);
	try {
		text = window.localStorage.getItem(name);
		nn = parseFloat(text);
	} catch (e) {
		console.log("readNumFromStorage: " + name + ": " + e);
	}
	if (isNaN(nn)) {
		nn = defValue;
	}
	if (nn > maxValue) {
		nn = maxValue;
	}
	if (nn < minValue) {
		nn = minValue;
	}
	return nn;
}
function stopPlay() {
	try {
		if (app.testPlayOn) {
			app.testPlayStop();
			app.testPlayOn = false;
		} else {

			app.stopAudio5();
			/*
			var audioID = document.getElementById("playAudio");
			audioID.pause();
			 */
			//app.hideFog();
			app.playOn = false;
		}
	} catch (ex) {
		app.promptWarning("Error ", ex);
		console.log(ex);
	}
	app.renderSlotStep = false;
	app.renderer.menuSlot.menuItemPlay.caption = "Play";
	app.renderer.menuSlot.menuItemPlay.renderIcon = toolbox.iconPlayStart;
}
function mergeRiffs(evt) {
	console.log("mergeRiffs");
	console.log(evt);
	document.getElementById("mergeRiffs").style.visibility = 'hidden';
	var fileList = evt.target.files;
	if (fileList.length > 0) {
		var file = fileList.item(0);
		console.log(file);
		var fileReader = new FileReader();
		fileReader.onload = function (progressEvent) {
			if (progressEvent.target.readyState == FileReader.DONE) {
				console.log(progressEvent);
				var text = progressEvent.target.result;
				console.log(text);
				var o = JSON.parse(text);
				if (o != null) {
					//app.song = o;
					console.log("app.song.samples", app.song.samples);
					toolbox.mergeSamples(o, app.song);
					console.log("app.song.samples", app.song.samples);
					for (var i = 0; i < o.riffs.length; i++) {
						console.log("riff", i, o.riffs[i]);
						toolbox.mergeRiff(o.riffs[i], o, app.song);
						console.log("riff", i, o.riffs[i]);
					}

					//
					toolbox.adjustSamples(app.song);
					//app.renderer.loadSettings(app.song);
					app.renderer.menuRiffs.refresh();
					app.renderer.menuSamples.refresh();
					app.resize();
				}

			} else {
				console.log(progressEvent.target.readyState);
			}
		};
		fileReader.readAsBinaryString(file);
	}
}
function promptShiftMIDI(midiParser) {
	var items = [];
	app.showSong();
	/*
	items[items.length] = new Item("+0/16", "", function () {
			midiParser.parse(0, app.song.meter);
		});
	items[items.length] = new Item("+4/16", "", function () {
			midiParser.parse(4, app.song.meter);
		});
	items[items.length] = new Item("+8/16", "", function () {
			midiParser.parse(8, app.song.meter);
		});
	items[items.length] = new Item("+16/16", "", function () {
			midiParser.parse(16, app.song.meter);
		});
	items[items.length] = new Item("+24/16", "", function () {
			midiParser.parse(24, app.song.meter);
		});
	items[items.length] = new Item("+32/16", "", function () {
			midiParser.parse(32, app.song.meter);
		});
	items[items.length] = new Item("+40/16", "", function () {
			midiParser.parse(40, app.song.meter);
		});
	items[items.length] = new Item("+48/16", "", function () {
			midiParser.parse(48, app.song.meter);
		});
	items[items.length] = new Item("+56/16", "", function () {
			midiParser.parse(56, app.song.meter);
		});
	items[items.length] = new Item("Custom shift", "", function () {
			promptCustomShift(midiParser);
		});
	app.promptSelect("Import with shift", items);
	*/
	midiParser.parse(0, app.song.meter);
	app.renderer.fireRender();
}
function promptCustomShift(midiParser){
	var tt = prompt("Custom shift");
	var nn=0;
	try{
		nn=1.0*tt;
		if(isNaN(nn)){
			nn=0;
		}
	}catch(e){
		console.log(e);
	}
	midiParser.parse(nn, app.song.meter);
}
function importMID(evt) {
	console.log("importMID");
	console.log(evt);
	document.getElementById("importDiv").style.visibility = 'hidden';
	var fileList = evt.target.files;
	if (fileList.length > 0) {
		var file = fileList.item(0);
		console.log(file);
		var fileReader = new FileReader();
		fileReader.onload = function (progressEvent) {
			if (progressEvent.target.readyState == FileReader.DONE) {
				console.log(progressEvent);
				//result: "data:text/xml;base64,PFVwZGF0ZT4KCTxBcHA+CgkJPFZlcnNpb24+Mi4zLjcwPC9WZXJzaW9uPgoJCTxQYXRoVG9GVFBGaWxlPmFuZHJvaWQvSG9yZWNhMi5hcGs8L1BhdGhUb0ZUUEZpbGU+Cgk8L0FwcD4KPC9VcGRhdGU+Cg=="__proto__: FileReadertimeStamp: 1411533591733total: 115type: "load"__proto__: ProgressEvent main.js:165
				var arrayBuffer = progressEvent.target.result;
				var midiParser = new MidiParser(arrayBuffer);
				//midiParser.parse(0, app.song.meter);
				//midiParser.parse(48, app.song.meter);
				promptShiftMIDI(midiParser);
			} else {
				console.log(progressEvent.target.readyState);
			}
		};
		fileReader.readAsArrayBuffer(file);
	}
}
function isIE() {
	try {
		console.log(navigator.userAgent);
		if (navigator.userAgent.indexOf('MSIE') != -1) {
			var detectIEregexp = /MSIE (\d+\.\d+);///test for MSIE x.x
		} else // if no "MSIE" string in userAgent
		{
			var detectIEregexp = /Trident.*rv[ :]*(\d+\.\d+)///test for rv:x.x or rv x.x where Trident string exists
		}
		if (detectIEregexp.test(navigator.userAgent)) { //if some form of IE
			return true;
		} 
	} catch (ex) {
		console.log(ex);
	}
	return false;
}
function openSong(evt) {
	console.log("openSong");
	console.log(evt);
	document.getElementById("openSong").style.visibility = 'hidden';
	var fileList = evt.target.files;
	if (fileList.length > 0) {
		app.showSong();
		var file = fileList.item(0);
		console.log(file);
		if (isIE()) {
			console.log("for ie");
			var fileReader = new FileReader();
			fileReader.onload = function (progressEvent) {
				if (progressEvent.target.readyState == FileReader.DONE) {
					console.log(progressEvent);
					var arrayBuffer = progressEvent.target.result;
					//console.log(arrayBuffer);
					var text=String.fromCharCode.apply(null, new Uint8Array(arrayBuffer));
					//console.log(text);
					//result: "data:text/xml;base64,PFVwZGF0ZT4KCTxBcHA+CgkJPFZlcnNpb24+Mi4zLjcwPC9WZXJzaW9uPgoJCTxQYXRoVG9GVFBGaWxlPmFuZHJvaWQvSG9yZWNhMi5hcGs8L1BhdGhUb0ZUUEZpbGU+Cgk8L0FwcD4KPC9VcGRhdGU+Cg=="__proto__: FileReadertimeStamp: 1411533591733total: 115type: "load"__proto__: ProgressEvent main.js:165
					/*var text = progressEvent.target.result;
					//console.log(text);
					*/
					var o = JSON.parse(text);
					if (o != null) {
						app.song = o;
						toolbox.adjustSamples(app.song);

						app.renderer.loadSettings(app.song);
						app.resize();
					}

				} else {
					console.log(progressEvent.target.readyState);
				}
			};
			fileReader.readAsArrayBuffer (file);
		} else {
			var fileReader = new FileReader();
			fileReader.onload = function (progressEvent) {
				if (progressEvent.target.readyState == FileReader.DONE) {
					console.log(progressEvent);
					//result: "data:text/xml;base64,PFVwZGF0ZT4KCTxBcHA+CgkJPFZlcnNpb24+Mi4zLjcwPC9WZXJzaW9uPgoJCTxQYXRoVG9GVFBGaWxlPmFuZHJvaWQvSG9yZWNhMi5hcGs8L1BhdGhUb0ZUUEZpbGU+Cgk8L0FwcD4KPC9VcGRhdGU+Cg=="__proto__: FileReadertimeStamp: 1411533591733total: 115type: "load"__proto__: ProgressEvent main.js:165
					var text = progressEvent.target.result;
					//console.log(text);
					var o = JSON.parse(text);
					console.log(o);
					if (o != null) {
						app.song = o;
						toolbox.adjustSamples(app.song);

						app.renderer.loadSettings(app.song);
						app.resize();
					}

				} else {
					console.log(progressEvent.target.readyState);
				}
			};
			fileReader.readAsBinaryString(file);
		}
	}
}
var fullScreen = false;
function switchFullScreen() {
	if (fullScreen) {
		cancelFullscreen(document.documentElement);
	} else {
		launchFullScreen(document.documentElement);
	}
}
function launchFullScreen(element) {
	if (element.requestFullScreen) {
		element.requestFullScreen();
	} else {
		if (element.mozRequestFullScreen) {
			element.mozRequestFullScreen();
		} else {
			if (element.webkitRequestFullScreen) {
				element.webkitRequestFullScreen();
			}
		}
	}
	fullScreen = true;
}
function cancelFullscreen() {
	if (document.cancelFullScreen) {
		document.cancelFullScreen();
	} else {
		if (document.mozCancelFullScreen) {
			document.mozCancelFullScreen();
		} else {
			if (document.webkitCancelFullScreen) {
				document.webkitCancelFullScreen();
			}
		}
	}
	fullScreen = false;
}
function Ticker(delay, action) {
	var me = this;
	me.delay = delay;
	me.next = 0;
	me.action = action;
	me.stopped = false;
	me.start = function () {
		me.next = new Date().getTime();
		me.stopped = false;
		me.tick();
	};
	me.stop = function () {
		me.stopped = true;
	};
	me.tick = function () {
		if (!me.stopped) {
			me.action();
			me.next = me.next + delay;
			var nextDelay = me.next - new Date().getTime();
			if (nextDelay < 1) {
				nextDelay = 1;
			}
			window.setTimeout(me.tick, nextDelay);
		}
	};
	return me;
}
function test2(){
	console.log("----------------test");
	var innu=0;
	var signed=app.cache.signeds[innu]
	var audioContext = null;
	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	audioContext = new AudioContext();
	var audioBuffer = audioContext.createBuffer(1, signed.length, 44100*2.5);
	var float32Array = audioBuffer.getChannelData(0);
	for (i = 0; i < float32Array.length; i++) {
		float32Array[i] = signed[i] / 768.0;
	}
	var audioBufferSourceNode = audioContext.createBufferSource();
	audioBufferSourceNode.buffer = audioBuffer; // Assign our buffer to the
	audioBufferSourceNode.connect(audioContext.destination);
	audioBufferSourceNode.start();
	console.log(app.cache.paths[innu]);
	console.log("----------------done");
}
function test() {
	console.log("----------------test");
	var div = document.getElementById('playDiv');
	div.style.visibility = 'visible';
	var song = new Song();
	song.tempo = 120;
	song.meter = 32;
	var position = toolbox.getPositionFromSong(0, 0, song);
	var riff = new SongRiff();
	toolbox.addRiffToSong(riff, song);
	toolbox.addRiffIdToPosition(riff.id, position);
	/*
	 * var sample=new SongSample();
	 * sample.id="http://javafx.me/sf/instruments/000/SynthGMS_000/003_067-076_60_-8300_15428-25212_44100";
	 * var sample2=new SongSample();
	 * sample2.id="http://javafx.me/sf/drums/000/SynthGMS_128/004_030-030_60_-4200_7-3567_44100";
	 * var sample3=new SongSample();
	 * sample3.id="http://javafx.me/sf/instruments/000/SynthGMS_000/000_000-050_60_-7500_10655-17227_44100";
	 * var sample4=new SongSample();
	 * sample4.id="http://javafx.me/sf/instruments/000/SynthGMS_000/001_051-057_60_-8100_17637-22127_44100";
	 *
	 *
	 * var sample5=new SongSample();
	 * sample5.id="http://javafx.me/sf/drums/000/SynthGMS_128/013_038-038_60_-5600_7-3873_44100";
	 *
	 * song.samples[song.samples.length]=sample;
	 * song.samples[song.samples.length]=sample2;
	 * song.samples[song.samples.length]=sample3;
	 * song.samples[song.samples.length]=sample4;
	 * song.samples[song.samples.length]=sample5;
	 */
	// app.tools.addSampleToSong(sample, song);
	var sample = toolbox.addSampleToSong("http://javafx.me/sf/instruments/000/SynthGMS_000/003_067-076_60_-8300_15428-25212_44100", song);
	var sample2 = toolbox.addSampleToSong("http://javafx.me/sf/drums/000/SynthGMS_128/004_030-030_60_-4200_7-3567_44100", song);
	var sample3 = toolbox.addSampleToSong("http://javafx.me/sf/instruments/000/SynthGMS_000/000_000-050_60_-7500_10655-17227_44100", song);
	var sample4 = toolbox.addSampleToSong("http://javafx.me/sf/instruments/000/SynthGMS_000/001_051-057_60_-8100_17637-22127_44100", song);
	var sample5 = toolbox.addSampleToSong("http://javafx.me/sf/drums/000/SynthGMS_128/013_038-038_60_-5600_7-3873_44100", song);
	var sampleDrumBass = toolbox.addSampleToSong("http://javafx.me/sf/drums/000/SynthGMS_128/010_035-035_60_-5000_7-1599_44100", song);
	var sampleClosedHiHat = toolbox.addSampleToSong("http://javafx.me/sf/drums/000/SynthGMS_128/019_042-042_60_-5000_5828-11705_44100", song);
	sampleClosedHiHat.volume = 0.3;
	var sampleSnare = toolbox.addSampleToSong("http://javafx.me/sf/drums/000/SynthGMS_128/013_038-038_60_-5600_7-3873_44100", song);
	// var
	// sampleBass=toolbox.addSampleToSong("http://javafx.me/sf/instruments/037/SynthGMS_000/000_000-088_60_-6700_2345-2459_44100",song);
	var sampleBass = toolbox.addSampleToSong("http://javafx.me/sf/instruments/037/Chaos_000/000_000-037_60_-3600_8-24214_44100	", song);
	// var
	// sampleBass=toolbox.addSampleToSong("http://javafx.me/sf/instruments/037/Chaos_000/001_038-127_60_-4300_8-25976_44100",song);
	// sampleBass.volume=1.0;
	// var
	// sampleDistortion=toolbox.addSampleToSong("http://javafx.me/sf/instruments/000/Kamac_001/000_028-039_60_-3800_21630-21930_22050",song);
	var sampleDistortion = toolbox.addSampleToSong("http://javafx.me/sf/instruments/030/Chaos_000/002_043-047_60_-4500_8-77742_22050", song);
	sampleDistortion.volume = 0.3;
	var tune = new SongRiffTune();
	tune.sampleId = sampleBass.id;
	toolbox.addTuneToRiff(tune, riff);
	toolbox.setTunePointToTune(0, 52, 2, 0, tune);
	toolbox.setTunePointToTune(2, 52, 2, 0, tune);
	toolbox.setTunePointToTune(4, 52, 2, 0, tune);
	toolbox.setTunePointToTune(6, 52, 2, 0, tune);
	toolbox.setTunePointToTune(8, 52, 2, 0, tune);
	toolbox.setTunePointToTune(10, 52, 2, 0, tune);
	toolbox.setTunePointToTune(12, 52, 2, 0, tune);
	toolbox.setTunePointToTune(14, 52, 2, 0, tune);
	toolbox.setTunePointToTune(16, 52, 2, 0, tune);
	toolbox.setTunePointToTune(18, 52, 2, 0, tune);
	toolbox.setTunePointToTune(20, 52, 2, 0, tune);
	toolbox.setTunePointToTune(22, 52, 2, 0, tune);
	toolbox.setTunePointToTune(24, 55, 2, 0, tune);
	toolbox.setTunePointToTune(26, 55, 2, 0, tune);
	toolbox.setTunePointToTune(28, 54, 2, 0, tune);
	toolbox.setTunePointToTune(30, 54, 2, 0, tune);
	var tune2 = new SongRiffTune();
	tune2.sampleId = sampleDistortion.id;
	toolbox.addTuneToRiff(tune2, riff);
	toolbox.setTunePointToTune(0, 76 - 12, 24, 0, tune2);
	toolbox.setTunePointToTune(24, 79 - 12, 4, 0, tune2);
	toolbox.setTunePointToTune(28, 78 - 12, 4, 0, tune2);
	toolbox.setBeatPointToRiff(0, sampleDrumBass.id, riff);
	toolbox.setBeatPointToRiff(4, sampleSnare.id, riff);
	toolbox.setBeatPointToRiff(8, sampleDrumBass.id, riff);
	toolbox.setBeatPointToRiff(12, sampleSnare.id, riff);
	toolbox.setBeatPointToRiff(16, sampleDrumBass.id, riff);
	toolbox.setBeatPointToRiff(20, sampleSnare.id, riff);
	toolbox.setBeatPointToRiff(24, sampleDrumBass.id, riff);
	toolbox.setBeatPointToRiff(28, sampleSnare.id, riff);
	toolbox.setBeatPointToRiff(0, sampleClosedHiHat.id, riff);
	toolbox.setBeatPointToRiff(2, sampleClosedHiHat.id, riff);
	toolbox.setBeatPointToRiff(4, sampleClosedHiHat.id, riff);
	toolbox.setBeatPointToRiff(6, sampleClosedHiHat.id, riff);
	toolbox.setBeatPointToRiff(8, sampleClosedHiHat.id, riff);
	toolbox.setBeatPointToRiff(10, sampleClosedHiHat.id, riff);
	toolbox.setBeatPointToRiff(12, sampleClosedHiHat.id, riff);
	toolbox.setBeatPointToRiff(14, sampleClosedHiHat.id, riff);
	toolbox.setBeatPointToRiff(16, sampleClosedHiHat.id, riff);
	toolbox.setBeatPointToRiff(18, sampleClosedHiHat.id, riff);
	toolbox.setBeatPointToRiff(20, sampleClosedHiHat.id, riff);
	toolbox.setBeatPointToRiff(22, sampleClosedHiHat.id, riff);
	toolbox.setBeatPointToRiff(24, sampleClosedHiHat.id, riff);
	toolbox.setBeatPointToRiff(26, sampleClosedHiHat.id, riff);
	toolbox.setBeatPointToRiff(28, sampleClosedHiHat.id, riff);
	toolbox.setBeatPointToRiff(30, sampleClosedHiHat.id, riff);
	// toolbox.dumpSong(song);
	app.mixer.mixPosition(position, song, function (signed) {
		//console.log(signed);
		//app.playAudioTizen(signed);
		app.playAudioChrome(signed);
		//window.open(signed);
		/*
		 * var audioContext = new webkitAudioContext(); var int8Array = new
		 * Int8Array (signed.length); int8Array.set(signed); var onError =
		 * function onError(error){ console.log('Error decoding file data.'); };
		 * var onSuccess = function onSuccess(audioBuffer){
		 * console.log("onSuccess"); if (!buffer) { console.log('Error decoding
		 * file data.'); return; } var audioBufferSourceNode =
		 * audioContext.createBufferSource(); audioBufferSourceNode.buffer =
		 * audioBuffer; // buffer variable is data of AudioBuffer type from the
		 * decodeAudioData() function.
		 * audioBufferSourceNode.connect(audioContext.destination); // Connect
		 * SourceNode to DestinationNode. audioBufferSourceNode.noteOn(0); };
		 * console.log("try"); audioContext.decodeAudioData(int8Array,
		 * onSuccess, onError); console.log("done");
		 */
	});
	/*
	 * var bl = new BinaryLoader();
	 * bl.load("http://javafx.me/sf/instruments/000/SynthGMS_000/002_058-066_60_21506-21569_44100"// ,
	 * function(){ //console.log("ok " + bl.arrayBuffer); //var dataView = new
	 * DataView(bl.arrayBuffer); console.log("ok ");
	 * console.log(bl.arrayBuffer); }// , function(){ console.log("bad " +
	 * bl.error); }// );
	 */
	console.log("done test");
}
