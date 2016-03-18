/* global $ Vue */
'use strict';

// App data

var data = {
	channelNames: ['freecodecamp', 'ESL_LOL', 'ESL_SC2', 'SmoothMcGroove', 'brunofin', 'ESL_CSGO', 'ObamaCareTeam'],
	statuses: Object.freeze({
		0: 'online',
		1: 'offline',
		2: 'nonexistent'
	}),
	channelInfos: {
		online: [],
		offline: [],
		nonexistent: []
	}
};

// DOM elements (batched queries for perfomance)
var DOMElements = {
	channels: {
		online: document.querySelector('.channels__online'),
		offline: document.querySelector('.channels__offline'),
		nonexistent: document.querySelector('.channels__nonexistent')
	}
};

// API call
var getSingleInfo = function getSingleInfo(type, callback, name) {
	$.ajax({
		type: 'GET',
		url: 'https://api.twitch.tv/kraken/' + type + 's/' + name + '?api_version=3',
		complete: callback.bind(null, name, type)
	});
};

var getInfos = function getInfos(list, callback) {
	// curry getSingleInfo function with call type and callback
	var get = getSingleInfo.bind(null, 'stream', callback);

	list.forEach(function (s) {
		return get(s);
	});
};

// I know.
// FIXME: This function needs refactoring. Serious one.
var saveChannelInfo = function saveChannelInfo(name, type, request, status) {
	var response = request.responseJSON;

	if (request) {
		if (status === 'error') {
			if (response.status === 422) {
				// User doesn't exist
				data.channelInfos[data.statuses[2]].push({ name: name, logo: null });
			} else {
				console.error('API call error:', status, request);
			}
		} else {
			if (type === 'stream') {
				if (response.stream) {
					// channel online
					data.channelInfos[data.statuses[0]].push(response.stream.channel);
				} else {
					getSingleInfo('channel', saveChannelInfo, name);
				}
			} else if (type === 'channel') {
				data.channelInfos[data.statuses[1]].push(response);
			}
		}
	}
};

// Initializing function
var init = function init(channelList) {
	// curry saveChannelInfo function with storageObject
	var save = saveChannelInfo;

	getInfos(channelList, save);
};

var app = new Vue({
	el: '#app',
	data: data.channelInfos
});

// Fire away!
init(data.channelNames);
