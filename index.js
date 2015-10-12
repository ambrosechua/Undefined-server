var fs = require("fs");
var path = require("path");
var mm = require("musicmetadata");

var express = require("express");

var art = {
	artists: {}
};

var tracks = {
	artists: {}
};

var music = {
	artists: {}
};

var toURL = function (str) {
	return encodeURIComponent(str);
};

var promise = new Promise(function (resolve, reject) {
	fs.readdir(path.join(__dirname, "music"), function (err, files) {
		if (err || !files) {
			resolve();
			return;
		}
		var promises = [];
		files.forEach(function (artist) {
			if (artist.charAt(0) == ".") {
				return;
			}
			art.artists[artist] = {
				albums: {},
				picture: []
			};
			tracks.artists[artist] = {
				albums: {}
			};
			music.artists[artist] = {
				albums: {}
			};
			var promise = new Promise(function (resolve, reject) {
				fs.readdir(path.join(__dirname, "music", artist), function (err, files) {
					if (err || !files) {
						resolve();
						return;
					}
					var promises = [];
					files.forEach(function (album) {
						if (album.charAt(0) == ".") {
							return;
						}
						art.artists[artist].albums[album] = {
							tracks: [],
							picture: []
						};
						tracks.artists[artist].albums[album] = {
							tracks: []
						};
						music.artists[artist].albums[album] = {
							tracks: []
						};
						var promise = new Promise(function (resolve, reject) {
							fs.readdir(path.join(__dirname, "music", artist, album), function (err, files) {
								if (err || !files) {
									resolve();
									return;
								}
								var promises = [];
								files.forEach(function (title) {
									if (title.charAt(0) == ".") {
										return;
									}
									var fn = path.join(__dirname, "music", artist, album, title);
									var promise = new Promise(function (resolve, reject) {
										fs.stat(fn, function (err, stat) {
											if (err || !stat) {
												resolve();
												return;
											}
											if (stat.isFile()) {
												if (title.match(/(.mp3|.wav|.m4a)/)) {
													mm(fs.createReadStream(fn), function (err, metadata) {
														if (err || !metadata) {
															console.log(err);
														}
														else {
															var number = parseInt(title.split(" ")[0], 10);
															if (isNaN(number)) {
																number = music.artists[artist].albums[album].tracks.length + 1;
															}
															metadata.number = number;
															metadata.file = toURL("/tracks/" + artist + "/" + album + "/" + title);
															music.artists[artist].albums[album].tracks[number - 1] = metadata;
															
															tracks.artists[artist].albums[album].tracks[number - 1] = {
																filename: fn,
																file: metadata.file
															};
															
															art.artists[artist].albums[album].tracks[number - 1] = {
																picture: []
															};
															art.artists[artist].albums[album].tracks[number - 1].picture = metadata.picture;
															if (!art.artists[artist].albums[album].picture[0] && metadata.picture[0]) {
																art.artists[artist].albums[album].picture = metadata.picture;
															}
															if (!art.artists[artist].picture[0] && metadata.picture[0]) {
																art.artists[artist].picture = metadata.picture;
															}
															music.artists[artist].albums[album].tracks[number - 1].picture = undefined;
														}
														resolve();
													});
												}
												else if (title.match(/(.jpg|.png)/)) {
													fs.readFile(fn, function (err, data) {
														if (!err) {
															var fns = fn.split(".");
															art.artists[artist].albums[album].picture = [{
																format:	fns[fns.length - 1],
																data: data
															}];
															art.artists[artist].picture = art.artists[artist].albums[album].picture;
														}
														resolve();
													});
												}
												else {
													resolve();
												}
											}
											else {
												resolve();
											}
										});
									});
									promises.push(promise);
								});
								Promise.all(promises).then(function () {
									music.artists[artist].albums[album].tracks.forEach(function (track, i) {
										if ((!art.artists[artist].albums[album].tracks[i].picture[0]) && art.artists[artist].albums[album].picture[0]) {
											art.artists[artist].albums[album].tracks[i].picture = art.artists[artist].albums[album].picture;
										}
									});
									if (music.artists[artist].albums[album].tracks.length < 1) {
										delete music.artists[artist].albums[album];
									}
									resolve();
								});
							});
						});
						promises.push(promise);
					});
					Promise.all(promises).then(function () {
						if (music.artists[artist].albums.length < 1) {
							delete music.artists[artist];
						}
						resolve();
					});
				});
			});
			promises.push(promise);
		});
		Promise.all(promises).then(resolve);
	});
});
promise.then(function () {
	try {
	for (var artist in music.artists) {
		for (var album in music.artists[artist].albums) {
			for (var track in music.artists[artist].albums[album].tracks) {
				music.artists[artist].albums[album].tracks[track].picture = toURL("/art/" + artist + "/" + album + "/" + (parseInt(track, 10) + 1));
			}
			music.artists[artist].albums[album].picture = toURL("/art/" + artist + "/" + album);
		}
		music.artists[artist].picture = toURL("/art/" + artist);
	}
	}
	catch (e) {
	console.error(e);
	}
	console.log("done");
});

var app = express();

app.get("/", function (req, res) {
	res.end(JSON.stringify(music));
});

app.get("/art/:artist", function (req, res) {
	res.end(art.artists[req.params.artist].picture[0].data);
});
app.get("/art/:artist/:album", function (req, res) {
	res.end(art.artists[req.params.artist].albums[req.params.album].picture[0].data);
});
app.get("/art/:artist/:album/:track", function (req, res) {
	res.end(art.artists[req.params.artist].albums[req.params.album].tracks[parseInt(req.params.track, 10) - 1].picture[0].data);
});

app.get("/tracks/:artist/:album/:track", function (req, res, next) {
	if (parseInt(req.params.track, 10) == req.params.track) {
		res.sendFile(tracks.artists[req.params.artist].albums[req.params.album].tracks[parseInt(req.params.track, 10) - 1].filename);
	}
	else {
		next();
	}
});
app.use("/tracks", express.static("music"));

app.listen(8080);
