/* global jQuery Vue localforage */
(function ($, Vue, localforage) {
	'use strict';

	if (!Array.prototype.find) {
		Array.prototype.find = function find(func) {
			return this.filter(func)[0];
		};
	}

	// App defaults
	const defaults = {
		channelNames: [
			'freecodecamp',
			'esl_lol',
			'esl_sc2',
			'smoothmcgroove',
			'esl_csgo',
			'obamacareteam',
		],
		statuses: Object.freeze({
			0: 'online',
			1: 'offline',
			2: 'nonexistent'
		})
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


	};


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

		created() {
			const vm = this;
			const save = saveChannelInfo.bind(null, vm.channels);

			localforage.getItem('channelNames', function (err, value) {
				if (err || !value) {
					vm.channelNames = defaults.channelNames;
				}
				else {
					vm.channelNames = value;
				}

				getInfos(save, vm.channelNames);
			});
		},

		methods: {
			toggleEditMode() {
				this.editMode = !this.editMode;
				return this.editMode;
			},
			channelAdded(name) {
				return Boolean(this.channelNames.find(x => x === name));
			}
		},

		events: {
			removeChannel(id, status) {
				const channel = this.channels[status].find(x => x._id === id);
				this.channels[status].$remove(channel);
				this.channelNames.$remove(channel.name);
			},
			addStream(name) {
				const notAdded = !Boolean(this.channelNames.find(s => s === name));

				if (notAdded) {
					const save = saveChannelInfo.bind(null, this.channels);
					apiCall(save, createUrl('streams', name));
					this.channelNames.push(name);
				}
			}
		},

		watch: {
			channelNames() {
				const vm = this;
				localforage.setItem('channelNames', vm.channelNames, function (err, value) {
					if (err) {
						console.error('Saving changes locally unsuccesful. Error:', err);
					}
				});
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
						firstSearch: true,
					};
				},

				computed: {
					resultsNumber() {
						return this.searchResults.length;
					},
					noResults() {
						return !this.firstSearch && this.searchResults.length === 0;
					}
				},

				methods: {
					addStream(name) {
						this.$dispatch('addStream', name);
					},
					save(request, status) {
						const response = request.responseJSON;

						if (response) {
							this.resultsTotal = response._total;
							this.searchResults = response.channels;

							if(this.firstSearch) {
								this.firstSearch = false;
							}
						}
						else {
							throw new Error('No JSON object in response.');
						}
					},
					findStream(event, url) {
						url = url || createUrl('search/channels', null, this.streamName);

						apiCall(this.save, url);
					},
					channelAdded(name) {
						return this.$parent.channelAdded(name);
					}
				}
			}
		},
	});
}(jQuery, Vue, localforage));
