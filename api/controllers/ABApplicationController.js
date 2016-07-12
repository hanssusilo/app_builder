/**
 * ABApplicationController
 *
 * @description :: Server-side logic for managing Abapplications
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var AD = require('ad-utils');
var reloading = null;

module.exports = {

    _config: {
        model: "abapplication", // all lowercase model name
        actions: false,
        shortcuts: false,
        rest: true
    },
    
    
    /**
     * GET /app_builder/requirements
     */
    requirements: function(req, res) {
        res.set('content-type', 'application/javascript');
        
        var output = '';
        
        ABApplication.find()
        .then(function(list) {
            for (var i=0; i<list.length; i++) {
                output += 'System.import("opstools/AB_' + list[i].name + '");\n';
            }
            res.send(output);
            return null;
        })
        .catch(function(err) {
            res.AD.error(err);
            return null;
        });
        
    },
    
    
    /**
     * Generate the server side folder structure for an application.
     *
     * Objects and Pages are not generated.
     * Reloading the ORM is also needed to complete the activation.
     *
     * POST /app_builder/prepareApp/:id
     */
    prepare: function(req, res) {
        var appID = req.param('id');
        
        AppBuilder.buildApplication(appID)
        .fail(function(err) {
            res.AD.error(err);
        })
        .done(function() {
            res.AD.success({});
        });
    },
    
    
    /**
     * POST /app_builder/reloadORM
     *
     */
    reloadORM: function(req, res) {
        if (reloading && reloading.state() == 'pending') {
            reloading.always(function() {
                // Wait until current reload is finished before starting
                self.reloadORM(req, res);
            });
            return;
        }
        reloading = AD.sal.Deferred();
        
        AppBuilder.reload()
        .fail(function(err) {
            res.AD.error(err);
            reloading.reject(err);
        })
        .done(function() {
            res.AD.success({});
            reloading.resolve();
        });
    },
    
    
    /**
     * Generate the server side model definitions of all AB applications
     * and then reload the ORM.
     *
     * POST /app_builder/fullReload
     */
    fullReload: function(req, res) {
        var self = this;
        if (reloading && reloading.state() == 'pending') {
            reloading.always(function() {
                // Wait until current reload is finished before starting
                self.fullReload(req, res);
            });
            return;
        }
        reloading = AD.sal.Deferred();
        
        var appIDs = [];
        var objIDs = [];
        var pageIDs = [];
        
        async.series([
            // Find all AB applications
            function(next) {
                ABApplication.find()
                .populate('object')
                .then(function(list) {
                    if (!list || !list[0]) {
                        throw new Error('No applications found');
                    }
                    
                    for (var i=0; i<list.length; i++) {
                        appIDs.push(list[i].id);
                        for (var j=0; j<list[i].object.length; j++) {
                            objIDs.push( list[i].object[j].id );
                        }
                    }
                    next();
                    return null;
                })
                .catch(function(err) {
                    next(err);
                    return null;
                });
            },
            
            // Create the application folders
            function(next) {
                async.eachSeries(appIDs, function(id, ok) {
                    AppBuilder.buildApplication(id)
                    .fail(ok)
                    .done(function() {
                        ok();
                    });
                }, function(err) {
                    if (err) next(err);
                    else next();
                });
            },
            
            // Create model definitions for each AB Object
            function(next) {
                async.eachSeries(objIDs, function(id, ok) {
                    AppBuilder.buildObject(id)
                    .fail(ok)
                    .done(function() {
                        ok();
                    });
                }, function(err) {
                    if (err) next(err);
                    else next();
                });
            },
            
            // Find all AB root Pages
            function(next) {
                ABPage.find({ parent: null })
                .then(function(list) {
                    if (list && list[0]) {
                        for (var i=0; i<list.length; i++) {
                            pageIDs.push( list[i].id );
                        }
                    }
                    next();
                    return null;
                })
                .catch(function(err) {
                    next(err);
                });
            },
            
            // Reload ORM
            function(next) {
                AppBuilder.reload()
                .fail(next)
                .done(function() {
                    next();
                });
            },
            
            // Generate all Page controllers
            function(next) {
                async.eachSeries(pageIDs, function(id, ok) {
                    AppBuilder.buildPage(id)
                    .fail(ok)
                    .done(function() {
                        ok();
                    });
                }, function(err) {
                    if (err) next(err);
                    else next();
                });
            },
            
            
        ], function(err) {
            if (err) {
                console.error(err);
                res.AD.error(err);
                reloading.reject(err);
            } else {
                res.AD.success({});
                reloading.resolve();
            }
        });
    }
	
};

