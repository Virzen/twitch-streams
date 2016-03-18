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
		online: [{
			display_name: 'Test',
			logo: 'https://static-cdn.jtvnw.net/jtv_user_pictures/esl_csgo-profile_image-546a0c1883798a41-300x300.jpeg',
			status: 'Test test'
		}],
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

var url = function url(type, name) {
	return 'https://api.twitch.tv/kraken/' + type + 's/' + name + '?api_version=3';
};

// API call
var getSingleInfo = function getSingleInfo(callback, url) {
	$.ajax({
		type: 'GET',
		url: url,
		complete: callback
	});
};

var getInfos = function getInfos(callback, list) {
	// curry getSingleInfo function with call type and callback
	var get = getSingleInfo.bind(null, callback);
	var type = 'stream';

	list.forEach(function (s) {
		return get(url(type, s));
	});
};

// I know.
// FIXME: This function needs refactoring. Serious one.
var saveChannelInfo = function saveChannelInfo(request, status) {
	var response = request.responseJSON;

	if (request) {
		if (status === 'error') {
			if (response.status === 422) {
				// user doesn't exist
				var name = response.message.split('\'')[1];
				data.channelInfos.nonexistent.push({ name: name, logo: null });
			} else {
				console.error('API call error:', status, request);
			}
		} else {
			if (response.stream) {
				// channel online
				data.channelInfos.online.push(response.stream.channel);
			} else if (response._id) {
				// channel offline
				data.channelInfos.offline.push(response);
			} else {
				// make additional request for offline channel's info
				getSingleInfo(saveChannelInfo, response._links.channel);
			}
		}
	}
};

// Initializing function
var init = function init(channelList) {
	getInfos(saveChannelInfo, data.channelNames);
};

new Vue({
	el: '#app',

	data: {
		channels: data.channelInfos,
		editMode: false,
		streamName: ''
	},

	methods: {
		toggleEditMode: function toggleEditMode() {
			this.editMode = !this.editMode;
			return this.editMode;
		},
		removeChannel: function removeChannel(index, status) {
			var statusStr = data.statuses[status];

			this.channels[statusStr].$remove(this.channels[statusStr][index]);
		},
		addStream: function addStream() {
			getSingleInfo(saveChannelInfo, url('stream', this.streamName));
		}
	},

	ready: init
});
