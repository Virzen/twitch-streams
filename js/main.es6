/* global $ Vue */
'use strict';

// App data
const data = {
	channelNames: [
		'freecodecamp',
		'ESL_LOL',
		'ESL_SC2',
		'SmoothMcGroove',
		'ESL_CSGO',
		'ObamaCareTeam',
	],
	statuses: Object.freeze({
		0: 'online',
		1: 'offline',
		2: 'nonexistent'
	}),
	channelInfos: {
		online: [
			// {
			// 	display_name: 'Test',
			// 	logo: 'https://static-cdn.jtvnw.net/jtv_user_pictures/esl_csgo-profile_image-546a0c1883798a41-300x300.jpeg',
			// 	status: 'Test test',
			// },
		],
		offline: [],
		nonexistent: [],
	}
};


// DOM elements (batched queries for perfomance)
const DOMElements = {
	channels: {
		online: document.querySelector('.channels__online'),
		offline: document.querySelector('.channels__offline'),
		nonexistent: document.querySelector('.channels__nonexistent'),
	},
};

// TODO: add passing any parameters
const createUrl = function createUrl(endpoint, data, query) {
	return `https://api.twitch.tv/kraken/${endpoint}${data ? '/' + data : ''}?api_version=3${query ? `&q=${query}` : ''}`;
};

// API calls
const apiCall = function apiCall(callback, url) {
	$.ajax({
		type: 'GET',
		url: url,
		complete: callback,
	});
};

const getInfos = function getInfos(callback, list) {
	// curry apiCall function with callback
	const get = apiCall.bind(null, callback);
	const type = 'streams';

	list.forEach(name => get(createUrl(type, name)));
};

/**
 * Finds out channel's status and saves it in data property accordingly
 * @param  {JSON} request
 * @param  {string} status
 * @return none
 */
const saveChannelInfo = function saveChannelInfo(storage, request, status) {
	const response = request.responseJSON;
	console.log(request);

	if (response) {
		if (status === 'error') {
			if (response.status === 422) {
				// user doesn't exist
				console.log('User doesn\'t exists.');
			}
			else {
				console.error('API call error:', status, request.responseJSON);
			}
		}
		else {
			if (response.stream) {
				// channel online
				storage.online.push(response.stream.channel);
			}
			else if (response._id) {
				// channel offline
				storage.offline.push(response);
			}
			else {
				// make additional request for offline channel's info
				const save = saveChannelInfo.bind(null, storage);
				apiCall(save, response._links.channel);
			}
		}
	}
	else {
		throw new Error('No JSON object in response.');
	}
};


// Initializing function
const init = function init(channelList) {
	const save = saveChannelInfo.bind(null, data.channelInfos);
	getInfos(save, data.channelNames);
};


new Vue({
	el: '#app',

	data: {
		channelNames: data.channelNames,
		channels: data.channelInfos,
		editMode: false
	},

	methods: {
		toggleEditMode() {
			this.editMode = !this.editMode;
			return this.editMode;
		}
	},

	events: {
		removeChannel(id, status) {
			const index = this.channels[status].findIndex(x => x._id === id);
			this.channels[status].$remove(this.channels[status][index]);
		},
		addStream(name) {
			const save = saveChannelInfo.bind(null, this.channels);
			apiCall(save, createUrl('streams', name));
		}
	},

	components: {
		channel: {
			template: '#channel-template',

			props: ['index', 'channel', 'status', 'edit-mode'],

			methods: {
				removeChannel(index, status) {
					this.$dispatch('removeChannel', index, status);
				}
			}
		},

		'search-form': {
			props: ['edit-mode'],

			data: function () {
				return {
					streamName: '',
					searchResults: [],
					resultsTotal: 0,
					selectedChannels: [],
				};
			},

			computed: {
				resultsNumber: function () {
					return this.searchResults.length;
				}
			},

			methods: {
				addSelected() {
					if (this.selectedChannels) {
						const vm = this;
						this.selectedChannels.forEach(name => {
							vm.$dispatch('addStream', name);
						});
					}
				},
				save(request, status) {
					const response = request.responseJSON;

					if (response) {
						console.log(response);
						this.resultsTotal = response._total;
						this.searchResults = response.channels;
					}
					else {
						throw new Error('No JSON object in response.');
					}
				},
				findStream(event, url) {
					if (this.streamName) {
						url = url || createUrl('search/channels', null, this.streamName);

						apiCall(this.save, url);
					}
				}
			}
		}
	},

	ready: init
});
