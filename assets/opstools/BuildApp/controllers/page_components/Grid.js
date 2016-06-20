steal(
	// List your Controller's dependencies here:
	function () {
        System.import('appdev').then(function () {
			steal.import('appdev/ad',
				'appdev/control/control').then(function () {

					// Namespacing conventions:
					// AD.Control.extend('[application].[controller]', [{ static },] {instance} );
					AD.Control.extend('opstools.BuildApp.Components.Grid', {

						init: function (element, options) {
							var self = this;

							self.data = {};
							self.info = {
								name: 'Grid',
								icon: 'fa-table'
							};

							self.getComponentInfo = function () {
								return self.data.componentInfo;
							};

							self.getView = function () {
								return null;
							};

							self.getEditView = function () {
								return null;
							};

							self.getPropertyView = function () {
								return null;
							};

							self.getSettings = function () {
								return null;
							}

							self.populateSettings = function (settings) {
								return null;
							};
						},

						getInstance: function () {
							return this;
						}


					});

				});
		});
	}
);