/* global $ Vue localforage */
'use strict';

// App defaults

var defaults = {
	channelNames: ['freecodecamp', 'esl_lol', 'esl_sc2', 'smoothmcgroove', 'esl_csgo', 'obamacareteam'],
	statuses: Object.freeze({
		0: 'online',
		1: 'offline',
		2: 'nonexistent'
	})
};

// DOM elements (batched queries for perfomance)
var DOMElements = {
	channels: {
		online: document.querySelector('.channels__online'),
		offline: document.querySelector('.channels__offline'),
		nonexistent: document.querySelector('.channels__nonexistent')
	}
};

// TODO: add passing any parameters
var createUrl = function createUrl(endpoint, data, query) {
	return 'https://api.twitch.tv/kraken/' + endpoint + (data ? '/' + data : '') + '?api_version=3' + (query ? '&q=' + query : '');
};

// API calls
var apiCall = function apiCall(callback, url) {
	$.ajax({
		type: 'GET',
		url: url,
		complete: callback
	});
};

var getInfos = function getInfos(callback, list) {
	// curry apiCall function with callback
	var get = apiCall.bind(null, callback);
	var type = 'streams';

	list.forEach(function (name) {
		return get(createUrl(type, name));
	});
};

/**
 * Finds out channel's status and saves it in data property accordingly
 * @param  {JSON} request
 * @param  {string} status
 * @return none
 */
var saveChannelInfo = function saveChannelInfo(storage, request, status) {
	var response = request.responseJSON;

	if (response) {
		if (status === 'error') {
			if (response.status === 422) {
				// user doesn't exist
				console.log('User doesn\'t exists.');
			} else {
				console.error('API call error:', status, request.responseJSON);
			}
		} else {
			if (response.stream) {
				// channel online
				storage.online.push(response.stream.channel);
			} else if (response._id) {
				// channel offline
				storage.offline.push(response);
			} else {
				// make additional request for offline channel's info
				var save = saveChannelInfo.bind(null, storage);
				apiCall(save, response._links.channel);
			}
		}
	} else {
		throw new Error('No JSON object in response.');
	}
};

// Initializing function
var init = function init(channelList) {};

new Vue({
	el: '#app',

	data: {
		channelNames: [],
		channels: {
			online: [],
			offline: [],
			nonexistent: []
		},
		editMode: false
	},

	created: function created() {
		var vm = this;
		var save = saveChannelInfo.bind(null, vm.channels);

		localforage.getItem('channelNames', function (err, value) {
			if (err || !value) {
				vm.channelNames = defaults.channelNames;
			} else {
				vm.channelNames = value;
			}

			getInfos(save, vm.channelNames);
		});
	},


	methods: {
		toggleEditMode: function toggleEditMode() {
			this.editMode = !this.editMode;
			return this.editMode;
		}
	},

	events: {
		removeChannel: function removeChannel(id, status) {
			var channel = this.channels[status].find(function (x) {
				return x._id === id;
			});
			this.channels[status].$remove(channel);
			this.channelNames.$remove(channel.name);
		},
		addStream: function addStream(name) {
			var notAdded = !Boolean(this.channelNames.find(function (s) {
				return s === name;
			}));

			if (notAdded) {
				var save = saveChannelInfo.bind(null, this.channels);
				apiCall(save, createUrl('streams', name));
				this.channelNames.push(name);
			}
		}
	},

	watch: {
		channelNames: function channelNames() {
			var vm = this;
			localforage.setItem('channelNames', vm.channelNames, function (err, value) {
				console.log(err, value);
			});
		}
	},

	components: {
		channel: {
			template: '#channel-template',

			props: ['index', 'channel', 'status', 'edit-mode'],

			methods: {
				removeChannel: function removeChannel(index, status) {
					this.$dispatch('removeChannel', index, status);
				}
			}
		},

		'search-form': {
			props: ['edit-mode'],

			data: function data() {
				return {
					streamName: '',
					searchResults: [],
					resultsTotal: 0,
					selectedChannels: []
				};
			},

			computed: {
				resultsNumber: function resultsNumber() {
					return this.searchResults.length;
				}
			},

			methods: {
				addSelected: function addSelected() {
					var _this = this;

					if (this.selectedChannels) {
						(function () {
							var vm = _this;
							_this.selectedChannels.forEach(function (name) {
								vm.$dispatch('addStream', name);
							});
						})();
					}
				},
				save: function save(request, status) {
					var response = request.responseJSON;

					if (response) {
						console.log(response);
						this.resultsTotal = response._total;
						this.searchResults = response.channels;
					} else {
						throw new Error('No JSON object in response.');
					}
				},
				findStream: function findStream(event, url) {
					if (this.streamName) {
						url = url || createUrl('search/channels', null, this.streamName);

						apiCall(this.save, url);
					}
				}
			}
		}
	}
});

//# sourceMappingURL=main.js.map