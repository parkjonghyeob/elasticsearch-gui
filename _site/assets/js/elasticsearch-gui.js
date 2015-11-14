/*! elasticsearch-gui - v2.0.0 - 2015-11-14
* https://github.com/jettro/elasticsearch-gui
* Copyright (c) 2015 ; Licensed  */
(function() {
    'use strict';
    angular
        .module('guiapp.aggregatedialog', []);
})();

(function() {
    'use strict';
        var guiapp = angular.module('guiapp',
            [
                'ngRoute',
                'guiapp.filters',
                'guiapp.directives',
                'ui.bootstrap',
                'elasticsearch',
                'gridshore.c3js.chart',
                'guiapp.services',
                'guiapp.dashboard',
                'guiapp.navbar',
                'guiapp.search',
                'guiapp.aggregatedialog',
                'guiapp.snapshot',
                'guiapp.nodeinfo',
                'guiapp.graph',
                'guiapp.inspect'
            ]);

    guiapp.config(['$routeProvider', function ($routeProvider) {
        $routeProvider.when('/query', {templateUrl: 'partials/query.html', controller: 'QueryCtrl'});
        $routeProvider.when('/inspect', {templateUrl: 'partials/inspect.html', controller: 'InspectCtrl'});
        //$routeProvider.when('/inspect/:index/:id', {templateUrl: 'partials/inspect.html', controller: 'InspectCtrl'});
        $routeProvider.when('/tools/suggestions', {templateUrl: 'partials/suggestions.html', controller: 'SuggestionsCtrl'});
        $routeProvider.when('/tools/whereareshards', {templateUrl: 'partials/whereareshards.html', controller: 'WhereShardsCtrl'});
        $routeProvider.when('/tools/monitoring', {templateUrl: 'partials/monitoring.html', controller: 'MonitoringCtrl'});
        $routeProvider.when('/about', {templateUrl: 'partials/about.html'});
        $routeProvider.otherwise({redirectTo: '/dashboard'});
    }]);

    guiapp.value('localStorage', window.localStorage);

    //guiapp.factory('$exceptionHandler',['$injector', function($injector) {
    //    return function(exception, cause) {
    //        console.log(exception);
    //        var errorHandling = $injector.get('errorHandling');
    //        errorHandling.add(exception.message);
    //        throw exception;
    //    };
    //}]);

})();
(function() {
    'use strict';
    angular
        .module('guiapp.dashboard', ['guiapp.services','ngRoute']);
})();

(function() {
    'use strict';
    angular
        .module('guiapp.graph', ['guiapp.services','ngRoute','guiapp.aggregatedialog']);
})();

(function() {
    'use strict';
    angular
        .module('guiapp.inspect', ['guiapp.services','ngRoute']);
})();

(function() {
    'use strict';

    angular
        .module('guiapp.navbar', ['guiapp.services']);
})();

(function() {
    'use strict';
    angular
        .module('guiapp.nodeinfo', ['guiapp.services','ngRoute']);
})();

(function() {
    'use strict';
    angular
        .module('guiapp.search', ['guiapp.services','ngRoute']);
})();

(function() {
    'use strict';
    var services = angular.module('guiapp.services', ['elasticsearch']);

    services.value('version', '2.0.0');
})();

(function() {
    'use strict';
    angular
        .module('guiapp.snapshot', ['guiapp.services','ngRoute']);
})();

(function () {
    'use strict';

    angular
        .module('guiapp.services')
        .factory('aggregateBuilder', AggregateBuilder);

    function AggregateBuilder() {
        return {
            build: build
        };

        function build (aggs) {
            var queryaggs = {};

            angular.forEach(aggs, function (aggregation, key) {
                if (aggregation.aggsType === 'term') {
                    queryaggs[aggregation.name] = {"terms": {"field": aggregation.field}};
                } else if (aggregation.aggsType === 'range') {
                    var ranges = [];
                    for (var j = 0; j < aggregation.ranges.length; j++) {
                        var range = aggregation.ranges[j];
                        if (range[0] == undefined) {
                            ranges.push({"to": range[1]})
                        } else if (range[1] == undefined) {
                            ranges.push({"from": range[0]})
                        } else {
                            ranges.push({"from": range[0], "to": range[1]});
                        }
                    }
                    queryaggs[aggregation.name] = {"range": {"field": aggregation.field, "ranges": ranges}};
                } else if (aggregation.aggsType === 'datehistogram') {
                    queryaggs[aggregation.name] = {
                        "date_histogram": {
                            "field": aggregation.field,
                            "interval": aggregation.interval
                        }
                    };
                } else if (aggregation.aggsType === 'histogram') {
                    queryaggs[aggregation.name] = {
                        "histogram": {
                            "field": aggregation.field,
                            "interval": aggregation.interval
                        }
                    };
                }
            });
            return queryaggs;
        }
    }
})();

(function () {
    'use strict';

    angular
    .module('guiapp.services')
        .factory('configuration', LocalStorageService);

    LocalStorageService.$inject = ['$rootScope', 'localStorage', '$location'];

    function LocalStorageService($rootScope, localStorage, $location) {
        var LOCAL_STORAGE_ID = 'es-config';

        var service = {
            configuration:{},
            changeConfiguration: changeConfiguration
        };

        initConfiguration();

        return service;

        function initConfiguration() {
            var configurationString = localStorage[LOCAL_STORAGE_ID];
            if (configurationString) {
                changeConfiguration(JSON.parse(configurationString));
            } else {
                var host;
                if ($location.host() == 'www.gridshore.nl') {
                    host = "http://localhost:9200";
                } else {
                    host = $location.protocol() + "://" + $location.host() + ":" + $location.port();
                }

                changeConfiguration({
                    title: undefined,
                    description: undefined,
                    excludedIndexes: undefined,
                    serverUrl: host
                });
            }

            $rootScope.$watch(function () {
                return service.configuration;
            }, function () {
                localStorage[LOCAL_STORAGE_ID] = JSON.stringify(service.configuration);
            }, true);
        }

        function changeConfiguration(configuration) {
            service.configuration = configuration;
        }
    }
})();

(function () {
    'use strict';
    angular
        .module('guiapp.services')
        .factory('elastic', ElasticService);

    ElasticService.$inject = ['esFactory', 'configuration', '$rootScope'];

    function ElasticService(esFactory, configuration, $rootScope) {
        var serverUrl = configuration.serverUrl;
        var statussus = {"green": "success", "yellow": "warning", "red": "error"};
        var es = createEsFactory();
        var activeIndexes = [];

        var service = {
            changeServerAddress: changeServerAddress,
            obtainServerAddress: function(){return serverUrl},
            clusterStatus: clusterStatus,
            clusterHealth: clusterHealth,
            clusterNodes: clusterNodes,
            obtainShards: obtainShards,
            nodeInfo: nodeInfo,
            indexes: indexes,
            removeIndex: removeIndex,
            openIndex: openIndex,
            closeIndex: closeIndex,
            indexesDetails: indexesDetails,
            types: types,
            documentTerms: documentTerms,
            fields: fields,
            changeReplicas: changeReplicas,
            snapshotRepositories: snapshotRepositories,
            createRepository: createRepository,
            deleteRepository: deleteRepository,
            obtainSnapshots: obtainSnapshots,
            obtainSnapshotStatus: obtainSnapshotStatus,
            removeSnapshot: removeSnapshot,
            restoreSnapshot: restoreSnapshot,
            createSnapshot: createSnapshot,
            doSearch: doSearch,
            suggest: suggest,
            getDocument: getDocument
        };

        // just to initialize the indices
        //indexes();

        return service;

        function changeServerAddress (serverAddress) {
            serverUrl = serverAddress;
            es = createEsFactory();
            indexes();
        }

        function clusterStatus (callback) {
            es.cluster.health({}).then(function (data) {
                var numClients = data.number_of_nodes - data.number_of_data_nodes;
                var msg = data.cluster_name + " [nodes: " + data.number_of_nodes + ", clients: " + numClients + "]";
                callback(msg, statussus[data.status]);
            }, function (reason) {
                callback("No connection", "error");
            });
        }

        function clusterHealth(callback) {
            es.cluster.health().then(function (data) {
                callback(data);
            });
        }

        function clusterNodes (callback) {
            es.nodes.info().then(function (data) {
                callback(data.nodes);
            });
        }

        function obtainShards (callback) {
            es.cluster.state({"metric": ["routing_table", "nodes"]}).then(function (data) {
                callback(data.nodes, data.routing_table.indices);
            });
        }

        function nodeInfo(nodeId, callback) {
            es.nodes.info({"nodeId": nodeId, "human": true}).then(function (data) {
                callback(data.nodes[nodeId]);
            });
        }

        function indexes (callback) {
            es.cluster.state({"ignoreUnavailable": true}).then(function (data) {
                var indices = [];
                for (var index in data.metadata.indices) {
                    var ignored = indexIsNotIgnored(index);
                    if (indexIsNotIgnored(index)) {
                        indices.push(index);
                    }
                }
                activeIndexes = indices;
                if (callback) {
                    callback(indices);
                }
            });
        }

        function removeIndex(index, callback) {
            es.indices.delete({"index": index}).then(function (data) {
                callback();
            });
        }

        function openIndex(index, callback) {
            es.indices.open({"index": index}).then(function (data) {
                callback();
            });
        }

        function closeIndex (index, callback) {
            es.indices.close({"index": index}).then(function (data) {
                callback();
            });
        }

        function indexesDetails(callback) {
            es.indices.stats({"human": true, "recovery": false}).then(function (statusData) {
                var indexesStatus = statusData.indices;
                es.cluster.state({"metric": "metadata"}).then(function (stateData) {
                    var indexesState = stateData.metadata.indices;
                    var indices = [];
                    angular.forEach(indexesState, function (value, key) {
                        var newIndex = {};
                        newIndex.name = key;
                        if (value.state === 'open') {
                            if (indexesStatus[key]) {
                                newIndex.size = indexesStatus[key].total.store.size;
                                newIndex.numDocs = indexesStatus[key].total.docs.count;
                            } else {
                                newIndex.size = "unknown";
                                newIndex.numDocs = "unknown";
                            }
                            newIndex.state = true;
                            newIndex.numShards = value.settings.index.number_of_shards;
                            newIndex.numReplicas = value.settings.index.number_of_replicas
                        } else {
                            newIndex.state = false;
                        }
                        indices.push(newIndex);
                    });
                    callback(indices);
                });
            });
        }

        function types (selectedIndex, callback) {
            var mappingFilter = {};
            if (selectedIndex.length > 0) {
                mappingFilter.index = selectedIndex.toString();
            }
            es.indices.getMapping(mappingFilter).then(function (data) {
                var myTypes = [];
                for (var index in data) {
                    if (indexIsNotIgnored(index)) {
                        for (var type in data[index].mappings) {
                            if (myTypes.indexOf(type) == -1 && type != "_default_") {
                                myTypes.push(type);
                            }
                        }
                    }
                }
                callback(myTypes);
            });
        }

        function documentTerms (index, type, id, callback) {
            es.termvectors(
                {
                    "index": index,
                    "type": type,
                    "id": id,
                    "routing":id,
                    "body": {
                        "fields": ["*"],
                        "field_statistics": false,
                        "term_statistics": true
                    }
                })
                .then(function (result) {
                    var fieldTerms = {};
                    if (result.term_vectors) {
                        angular.forEach(result.term_vectors, function (value, key) {
                            var terms = [];
                            angular.forEach(value.terms, function (term, termKey) {
                                terms.push(termKey);
                            });
                            fieldTerms[key] = terms;
                        });
                        callback(fieldTerms);
                    }
                });
        }

        function fields (selectedIndex, selectedType, callback) {
            var mappingFilter = {};
            if (selectedIndex.length > 0) {
                mappingFilter.index = selectedIndex.toString();
            }
            if (selectedType.length > 0) {
                mappingFilter.type = selectedType.toString();
            }
            es.indices.getMapping(mappingFilter).then(function (data) {
                var myTypes = [];
                var myFields = {};
                for (var index in data) {
                    if (indexIsNotIgnored(index)) {
                        for (var type in data[index].mappings) {
                            if (myTypes.indexOf(type) == -1 && type != "_default_") {
                                myTypes.push(type);
                                var properties = data[index].mappings[type].properties;
                                for (var field in properties) {
                                    handleSubfields(properties[field], field, myFields, undefined);
                                }
                            }
                        }
                    }
                }
                callback(myFields);
            });
        }

        function changeReplicas(index, numReplicas, callback) {
            var changeSettings = {
                "index": index,
                "body": {
                    "index": {
                        "number_of_replicas": numReplicas
                    }
                }
            };
            es.indices.putSettings(changeSettings).then(function (data) {
                callback(data);
            }, logErrors);
        }

        function snapshotRepositories(callback) {
            es.snapshot.getRepository().then(function (data) {
                callback(data);
            }, logErrors);
        }

        function createRepository (newRepository, callback) {
            var createrepo = {
                "repository": newRepository.repository,
                "body": {
                    "type": "fs",
                    "settings": {
                        "location": newRepository.location
                    }
                }
            };
            es.snapshot.createRepository(createrepo).then(function (data) {
                callback();
            }, broadcastError);
        }

        function deleteRepository(repository, callback) {
            es.snapshot.deleteRepository({"repository": repository}).then(function (data) {
                callback();
            }, broadcastError)
        }

        function obtainSnapshots(repository, callback) {
            es.snapshot.get({"repository": repository, "snapshot": "_all"}).then(function (data) {
                callback(data.snapshots);
            }, logErrors);
        }

        function obtainSnapshotStatus(callback) {
            es.snapshot.status().then(function (data) {
                callback(data.snapshots);
            }, logErrors);
        }

        function removeSnapshot(repository, snapshot, callback) {
            es.snapshot.delete({"repository": repository, "snapshot": snapshot}).then(function (data) {
                callback();
            }, logErrors);
        }

        function restoreSnapshot(repository, snapshot, callback) {
            es.snapshot.restore({"repository": repository, "snapshot": snapshot}).then(function (data) {
                callback();
            }, broadcastError);
        }

        function createSnapshot(newSnapshot, callback) {
            var aSnapshot = {
                "repository": newSnapshot.repository,
                "snapshot": newSnapshot.snapshot,
                "body": {
                    "indices": newSnapshot.indices,
                    "ignore_unavailable": newSnapshot.ignoreUnavailable,
                    "include_global_state": newSnapshot.includeGlobalState
                }
            };
            es.snapshot.create(aSnapshot).then(function (data) {
                callback();
            }, logErrors);
        }

        function handleSubfields(field, fieldName, myFields, nestedPath) {
            if (field.hasOwnProperty("properties")) {
                var nested = (field.type == "nested" | field.type == "object");
                if (nested) {
                    nestedPath = fieldName;
                }
                for (var subField in field.properties) {
                    var newField = fieldName + "." + subField;
                    handleSubfields(field.properties[subField], newField, myFields, nestedPath);
                }
            } else {
                if (field.hasOwnProperty("fields")) {
                    for (var multiField in field.fields) {
                        var multiFieldName = fieldName + "." + multiField;
                        // TODO jettro : fix the nested documents with multi_fields
                        if (!myFields[multiFieldName] && fieldName !== multiField) {
                            myFields[multiFieldName] = field.fields[multiField];
                            myFields[multiFieldName].nestedPath = nestedPath;
                            myFields[multiFieldName].forPrint = multiFieldName + " (" + field.type + ")";
                        }
                    }
                }
                if (!myFields[fieldName]) {
                    myFields[fieldName] = field;
                    myFields[fieldName].nestedPath = nestedPath;
                    myFields[fieldName].type = field.type;
                    myFields[fieldName].forPrint = fieldName + " (" + field.type + ")";
                }
            }
        }

        function doSearch (query, resultCallback, errorCallback) {
            if (query.index === "") {
                query.index = activeIndexes;
            }
            es.search(query).then(function (results) {
                resultCallback(results)
            }, function (errors) {
                errorCallback(errors)
            });
        }

        function getDocument (index,type,id, resultCallback, errorCallback) {
            es.get({
                index: index,
                type: type,
                id: id
            }).then(function(document) {
                resultCallback(document);
            }, function(errors) {
                errorCallback(errors);
            });
        }

        function suggest (suggestRequest, resultCallback) {
            var suggest = {};
            suggest.index = suggestRequest.index;
            suggest.body = {};
            suggest.body.mysuggester = {};
            suggest.body.mysuggester.text = suggestRequest.query;
            suggest.body.mysuggester.term = {};
            suggest.body.mysuggester.term.field = suggestRequest.field;
            suggest.body.mysuggester.term.min_word_length = suggestRequest.min_word_length;
            suggest.body.mysuggester.term.prefix_length = suggestRequest.prefix_length;

            es.suggest(suggest).then(function (results) {
                var suggested = {};
                if (results.mysuggester) {
                    for (var i = 0; i < results.mysuggester.length; i++) {
                        var item = results.mysuggester[i];
                        suggested[item.text] = [];
                        for (var j = 0; j < item.options.length; j++) {
                            suggested[item.text].push(item.options[j].text);
                        }

                    }
                }

                resultCallback(suggested);
            }, logErrors);
        }

        function createEsFactory() {
            return esFactory({"host": serverUrl, "apiVersion": "2.0"});
        }

        function indexIsNotIgnored(index) {
            var ignore = false;
            if (configuration.includedIndexes && configuration.includedIndexes.length > 0) {
                ignore = true;
                var includedIndexes = (configuration.includedIndexes) ? configuration.includedIndexes.split(",") : [];
                angular.forEach(includedIndexes, function (includedIndex) {
                    var indexToCheck = includedIndex.trim();
                    if (index.substring(0, indexToCheck.length) === indexToCheck) {
                        ignore = false;
                    }
                });
            } else {
                var excludedIndexes = (configuration.excludedIndexes) ? configuration.excludedIndexes.split(",") : [];
                angular.forEach(excludedIndexes, function (excludedIndex) {
                    var indexToCheck = excludedIndex.trim();
                    if (index.substring(0, indexToCheck.length) === indexToCheck) {
                        ignore = true;
                    }
                });
            }

            return !ignore;
        }

        function logErrors(errors) {
            console.log(errors);
        }

        function broadcastError(error) {
            $rootScope.$broadcast('msg:notification', 'error', error.message);
        }
    }
})();

(function () {
    'use strict';
    angular
        .module('guiapp.services')
        .factory('errorHandling', ErrorHandlingService);

    ErrorHandlingService.$inject = ['$rootScope'];

    function ErrorHandlingService($rootScope) {
        var service = {
            add: add
        };

        return service;

        // Implementations
        function add(message) {
            var errorMessage;
            if (message && typeof message === "object") {
                if (message.hasOwnProperty('message')) {
                    errorMessage = message.message;
                }
            } else {
                errorMessage = message;
            }
            $rootScope.$broadcast('msg:notification', 'error', errorMessage);
        }
    }
})();


(function () {
    'use strict';

    // TODO jettro: This feels so wrong to pass data between app and directive.

    angular
        .module('guiapp.services')
        .factory('indexService', IndexService);

    function IndexService() {
        return {
            name: "unknown",
            numreplicas: 0
        };
    }
})();

(function() {
    'use strict';

    angular
    .module('guiapp.services')
    .factory('queryStorage', QueryStorage);

    QueryStorage.$inject=['localStorage'];

    function QueryStorage(localStorage) {
        var LOCAL_STORAGE_ID_QUERY = 'es-query';
        var LOCAL_STORAGE_ID_SEARCH = 'es-search';

        var service = {
            loadQuery: loadQuery,
            saveQuery: saveQuery,
            loadSearch: loadSearch,
            saveSearch: saveSearch
        };

        return service;

        function loadQuery (callback) {
            var query = localStorage[LOCAL_STORAGE_ID_QUERY];
            callback(JSON.parse(query));
        }

        function saveQuery(query) {
            localStorage[LOCAL_STORAGE_ID_QUERY] = JSON.stringify(query);
        }

        function loadSearch (callback) {
            var search = localStorage[LOCAL_STORAGE_ID_SEARCH];
            callback(JSON.parse(search));
        }

        function saveSearch(search) {
            localStorage[LOCAL_STORAGE_ID_SEARCH] = JSON.stringify(search);
        }
    }

})();

(function() {
    'use strict';

    angular
        .module('guiapp.services')
        .factory('serverConfig', ServerConfig);

    ServerConfig.$inject = ['$location'];

    function ServerConfig(location) {
        var service = {
            host:"",
            initHost: initHost
        };
        return service;

        function initHost() {
            if (location.host() == 'www.gridshore.nl') {
                service.host = "http://localhost:9200";
            } else {
                service.host = location.protocol() + "://" + location.host() + ":" + location.port();
            }
        }
    }

})();

(function() {
    'use strict';
    angular
        .module('guiapp.aggregatedialog')
        .controller('AggregateDialogCtrl', AggregateDialogCtrl);

    AggregateDialogCtrl.$inject = ['$modalInstance', 'fields'];

    function AggregateDialogCtrl($modalInstance, fields) {
        var adVm = this;
        adVm.fields = fields;
        adVm.aggsTypes = ["Term", "Range", "Histogram", "DateHistogram"];
        adVm.ranges = [];
        adVm.intervals = ["year", "month", "week", "day", "hour", "minute"];

        adVm.close = close;
        adVm.addRangeField = addRangeField;

        function close (result) {
            var dialogResult = {};
            dialogResult.field = result.field;
            dialogResult.name = result.name;
            if (result.aggstype === 'Term') {
                dialogResult.aggsType = 'term';
            } else if (result.aggstype === 'Range') {
                dialogResult.aggsType = 'range';
                dialogResult.ranges = adVm.ranges;
            } else if (result.aggstype === 'DateHistogram') {
                dialogResult.aggsType = 'datehistogram';
                dialogResult.interval = result.interval;
            } else if (result.aggstype === 'Histogram') {
                dialogResult.aggsType = 'histogram';
                dialogResult.interval = result.interval;
            }
            $modalInstance.close(dialogResult);
        }

        function addRangeField(data) {
            adVm.ranges.push([data.range.from, data.range.to]);
        }
    }
})();
angular.module('guiapp').controller('MonitoringCtrl',['$scope', 'elastic', '$interval',
    function ($scope, elastic, $interval) {
    $scope.dataNodes=[];
    $scope.columnsNodes=[{"id":"num-nodes","type":"line","name":"Number of nodes"}];
    $scope.datax={"id":"x"};

    $scope.dataShards=[];
    $scope.columnsShards=[{"id":"num-shards-primary","type":"line","name":"Primary"},
        {"id":"num-shards-active","type":"line","name":"Active"},
        {"id":"num-shards-relocating","type":"line","name":"Relocating"},
        {"id":"num-shards-initializing","type":"line","name":"Initializing"},
        {"id":"num-shards-unassigned","type":"line","name":"Unassigned"}];
    $scope.dataxShards={"id":"xShards"};

    $scope.numPoints=10;
    $scope.lengthDelay=5000;

    var timerLoadNodes;
    $scope.loadNodes = function () {
        timerLoadNodes = $interval(function(){
            elastic.clusterNodes(function(data){
                if ($scope.dataNodes.length >= $scope.numPoints) {
                    $scope.dataNodes = $scope.dataNodes.splice(1,$scope.numPoints);
                }
                $scope.dataNodes.push({"x":new Date(),"num-nodes":Object.keys(data).length});
            });

            elastic.clusterHealth(function (data) {
                if ($scope.dataShards.length >= $scope.numPoints) {
                    $scope.dataShards = $scope.dataShards.splice(1,$scope.numPoints);
                }
                $scope.dataShards.push({"xShards":new Date(),
                    "num-shards-primary":data.active_primary_shards,
                    "num-shards-active":data.active_shards,
                    "num-shards-relocating":data.relocating_shards,
                    "num-shards-initializing":data.initializing_shards,
                    "num-shards-unassigned":data.unassigned_shards});
            });

        },$scope.lengthDelay);
    };

    $scope.loadNodes();
    // TODO add stop function
}]);

angular.module('guiapp').controller('NotificationCtrl',['$scope', '$timeout',
function ($scope, $timeout){
    $scope.alerts = {};

    $scope.$on('msg:notification', function (event, type, message) {
        var id = Math.random().toString(36).substring(2, 5);
        $scope.alerts[id] = {"type": type, "message": message};

        $timeout(function () {
            delete $scope.alerts[id];
        }, 10000);
    });
}]);

angular.module('guiapp').controller('QueryCtrl',['$scope', '$modal', '$location', 'elastic', 'aggregateBuilder', 'queryStorage',
function ($scope, $modal, $location, elastic, aggregateBuilder, queryStorage) {
    $scope.fields = [];
    $scope.createdQuery = "";

    $scope.queryResults = [];
    $scope.aggsResults = [];
    $scope.metaResults = {};
    $scope.queryFactory = {};
    $scope.query = {};

    $scope.query.chosenFields = [];
    $scope.query.aggs = {};
    $scope.query.indices = {};
    $scope.query.types = {};
    $scope.query.advanced = {};
    $scope.query.advanced.searchFields = [];
    $scope.query.advanced.newType = 'or';
    $scope.query.multiSearch=false;


    // initialize pagination
    $scope.currentPage = 1;
    $scope.maxSize = 5;
    $scope.numPages = 0;
    $scope.pageSize = 10;
    $scope.totalItems = 0;

    $scope.$watchCollection('query', function () {
        $scope.changeQuery();
    });

    $scope.changePage = function () {
        $scope.executeQuery();
    };

    $scope.restartSearch = function () {
        $scope.currentPage = 1;
        $scope.numPages = 0;
        $scope.pageSize = 10;
        $scope.totalItems = 0;
        $scope.executeQuery();
    };

    $scope.unbind = {};
    $scope.unbind.indicesScope = function () {
    };
    $scope.unbind.typesScope = function () {
    };

    /* Functions to retrieve values used to created the query */
    $scope.loadIndices = function () {
        $scope.unbind.indicesScope();
        elastic.indexes(function (data) {
            if (data) {
                for (var i = 0; i < data.length; i++) {
                    $scope.query.indices[data[i]] = {"name": data[i], "state": false};
                }
                $scope.unbind.indicesScope = $scope.$watch('query.indices', $scope.loadTypes, true);
            } else {
                $scope.query.indices = {};
            }
        });
    };

    $scope.loadTypes = function () {
        $scope.query.types = {};
        var selectedIndices = [];
        angular.forEach($scope.query.indices, function (index) {
            if (index.state) {
                selectedIndices.push(index.name);
            }
        });
        $scope.unbind.typesScope();
        elastic.types(selectedIndices, function (data) {
            if (data) {
                for (var i = 0; i < data.length; i++) {
                    $scope.query.types[data[i]] = {"name": data[i], "state": false};
                }
                $scope.unbind.typesScope = $scope.$watch('query.types', $scope.loadFields, true);
            } else {
                $scope.query.types = {};
            }
        });
    };

    $scope.loadFields = function () {
        var selectedIndices = [];
        angular.forEach($scope.query.indices, function (index) {
            if (index.state) {
                selectedIndices.push(index.name);
            }
        });

        var selectedTypes = [];
        angular.forEach($scope.query.types, function (type) {
            if (type.state) {
                selectedTypes.push(type.name);
            }
        });
        elastic.fields(selectedIndices, selectedTypes, function (data) {
            $scope.fields = data;
        });
    };

    /* Function to change the input for the query to be executed */
    $scope.addQueryField = function () {
        var i = $scope.query.chosenFields.indexOf($scope.queryFactory.addField);
        if (i == -1) {
            $scope.query.chosenFields.push($scope.queryFactory.addField);
        }
        $scope.changeQuery();
    };

    $scope.addAllQueryFields = function () {
        angular.forEach($scope.fields, function (value, key) {
            $scope.query.chosenFields.push(key);
        });
        $scope.changeQuery();
    };

    $scope.removeQueryField = function (index) {
        $scope.query.chosenFields.splice(index, 1);
        $scope.changeQuery();
    };

    $scope.addSearchField = function () {
        var searchField = {};
        searchField.field = $scope.query.advanced.newField;
        searchField.text = $scope.query.advanced.newText;
        searchField.type = $scope.query.advanced.newType;
        $scope.query.advanced.searchFields.push(searchField);
    };

    $scope.removeSearchField = function (index) {
        $scope.query.advanced.searchFields.splice(index, 1);
    };

    $scope.removeAggregateField = function (name) {
        delete $scope.query.aggs[name];
        $scope.changeQuery();
    };

    /* Functions to create, reset and execute the query */
    $scope.executeQuery = function () {
        $scope.changeQuery();
        var request = createQuery();
        $scope.metaResults = {};

        elastic.doSearch(request, function (results) {
            $scope.queryResults = results.hits;
            $scope.aggsResults = results.aggregations;
            $scope.numPages = Math.ceil(results.hits.total / $scope.pageSize);
            $scope.totalItems = results.hits.total;

            $scope.metaResults.totalShards = results._shards.total;
            if (results._shards.failed > 0) {
                $scope.metaResults.failedShards = results._shards.failed;
                $scope.metaResults.errors = [];
                angular.forEach(results._shards.failures, function (failure) {
                    $scope.metaResults.errors.push(failure.index + " - " + failure.reason);
                });

            }
        }, function (errors) {
            $scope.metaResults.failedShards = 1;
            $scope.metaResults.errors = [];
            $scope.metaResults.errors.push(errors.error);
        });
    };

    $scope.resetQuery = function () {
        $scope.loadIndices();
        $scope.query.term = "";
        $scope.query.chosenIndices = [];
        $scope.query.chosenTypes = [];
        $scope.query.chosenFields = [];
        $scope.query.advanced = {};
        $scope.query.advanced.searchFields = [];
        $scope.query.advanced.newType = 'or';
        $scope.query.advanced.newText = null;
        $scope.query.advanced.newField = null;

        $scope.query.multiSearch=false;

        $scope.changeQuery();
        $scope.query.type = "or";
    };

    $scope.changeQuery = function () {
        $scope.createdQuery = JSON.stringify(createQuery().body, null, 2);
    };

    $scope.openDialog = function () {
        var opts = {
            backdrop: true,
            keyboard: true,
            backdropClick: true,
            templateUrl: 'template/dialog/aggregate.html',
            controller: 'AggregateDialogCtrl',
            resolve: {fields: function () {
                return angular.copy($scope.fields)
            } }};
        var d = $modal.open(opts);
        d.result.then(function (result) {
            if (result) {
                $scope.query.aggs[result.name] = result;
                $scope.changeQuery();
            }
        });
    };

    $scope.saveQuery = function () {
        queryStorage.saveQuery(angular.copy($scope.query));
    };

    $scope.loadQuery = function () {
        queryStorage.loadQuery(function (data) {
            $scope.query = angular.copy(data);
            $scope.changeQuery();
        });
    };

    $scope.inspect = function(doc) {
        $location.path("/inspect/" + doc._index + "/" + doc._id);
    };

    function createQuery() {
        var query = {};
        query.index = "";
        query.body = {};
        query.body.query = {};

        query.size = $scope.pageSize;
        query.from = ($scope.currentPage - 1) * $scope.pageSize;

        var chosenIndices = [];
        angular.forEach($scope.query.indices, function (value) {
            if (value.state) {
                chosenIndices.push(value.name);
            }
        });
        query.index = chosenIndices.toString();

        var chosenTypes = [];
        angular.forEach($scope.query.types, function (value) {
            if (value.state) {
                chosenTypes.push(value.name);
            }
        });
        query.type = chosenTypes.toString();

        if ($scope.query.chosenFields.length > 0) {
            query.fields = $scope.query.chosenFields.toString();
        }
        if ($scope.query.multiSearch && $scope.query.advanced.searchFields.length > 0) {
            var tree = {};
            for (var i = 0; i < $scope.query.advanced.searchFields.length; i++) {
                var searchField = $scope.query.advanced.searchFields[i];
                var fieldForSearch = $scope.fields[searchField.field];
                recurseTree(tree, searchField.field, searchField.text, searchField.type);
                if (fieldForSearch.nestedPath) {
                    defineNestedPathInTree(tree, fieldForSearch.nestedPath, fieldForSearch.nestedPath);
                }
            }
            query.body.query = constructQuery(tree);

        } else if ($scope.query.term.length > 0) {
            var matchPart = {};
            matchPart.query = $scope.query.term;
            if ($scope.query.type === 'phrase') {
                matchPart.type = "phrase";
            } else {
                matchPart.operator = $scope.query.type;
            }
            query.body.query.match = {"_all": matchPart};
        } else {
            query.body.query.matchAll = {};
        }

        query.body.aggs = aggregateBuilder.build($scope.query.aggs);

        query.body.explain = $scope.query.explain;
        if ($scope.query.highlight) {
            var highlight = {"fields": {}};
            angular.forEach($scope.query.chosenFields, function (value) {
                highlight.fields[value] = {};
            });
            query.body.highlight = highlight;
        }
        return query;
    }

    function constructQuery(tree) {
        var props = Object.getOwnPropertyNames(tree);
        var boolQuery = {};
        boolQuery.bool = {};
        boolQuery.bool.must = [];
        for (var i = 0; i < props.length; i++) {
            var prop = props[i];
            if (tree[prop] instanceof Object) {
                boolQuery.bool.must.push(constructQuery(tree[prop]));
            } else if (!(prop.substring(0, 1) === "_")) {
                var fieldName = prop;
                if (tree._nested) {
                    fieldName = tree._nested + "." + fieldName;
                }

                var matchQuery = {};
                matchQuery[fieldName] = {};
                matchQuery[fieldName].query = tree[prop];
                if ($scope.query.type === 'phrase') {
                    matchQuery[fieldName].type = "phrase";
                } else {
                    console.log(tree[prop] + '-' + tree['_type_'+prop]);
                    matchQuery[fieldName].operator = tree['_type_'+prop];
                }
                boolQuery.bool.must.push({"match": matchQuery});
            }
        }

        var returnQuery;
        if (tree._nested) {
            var nestedQuery = {};
            nestedQuery.nested = {};
            nestedQuery.nested.path = tree._nested;
            nestedQuery.nested.query = boolQuery;
            returnQuery = nestedQuery;
        } else {
            returnQuery = boolQuery;
        }

        return returnQuery;
    }

    function defineNestedPathInTree(tree, path, nestedPath) {
        var pathItems = path.split(".");
        if (pathItems.length > 1) {
            defineNestedPathInTree(tree[pathItems[0]], pathItems.splice(1).join("."), nestedPath);
        } else {
            tree[path]._nested = nestedPath;
        }

    }

    function recurseTree(tree, newKey, value, type) {
        var newKeys = newKey.split(".");

        if (newKeys.length > 1) {
            if (!tree.hasOwnProperty(newKeys[0])) {
                tree[newKeys[0]] = {};
            }
            recurseTree(tree[newKeys[0]], newKeys.splice(1).join("."), value, type);
        } else {
            if (!tree.hasOwnProperty(newKey)) {
                tree[newKey] = value;
                tree['_type_' + newKey] = type;
            }
        }
    }

    this.errorCallback = function (errors) {
        console.log(errors);
    };

    $scope.resetQuery();
}]);

angular.module('guiapp').controller('SuggestionsCtrl',['$scope', 'elastic',
function ($scope, elastic) {
    $scope.suggest = {};
    $scope.suggest.index = '';
    $scope.suggest.field = '';
    $scope.suggest.query = '';
    $scope.suggest.min_word_length = 3;
    $scope.suggest.prefix_length = 1;

    $scope.sourcedata = {};
    $scope.sourcedata.indices = [];
    $scope.sourcedata.fields = [];

    $scope.results = {};

    $scope.unbind = {};
    $scope.unbind.indicesScope = function () {
    };

    $scope.doSuggest = function () {
        var request = {};
        request.index = $scope.suggest.index.name;
        request.field = $scope.suggest.field;
        request.query = $scope.suggest.query;
        request.min_word_length = $scope.suggest.min_word_length;
        request.prefix_length = $scope.suggest.prefix_length;

        elastic.suggest(request, function (result) {
            $scope.results = result;
        });
    };

    $scope.loadIndices = function () {
        $scope.unbind.indicesScope();
        elastic.indexes(function (data) {
            if (data) {
                for (var i = 0; i < data.length; i++) {
                    $scope.sourcedata.indices[i] = {"name": data[i]};
                }
                $scope.unbind.indicesScope = $scope.$watch('suggest.index', $scope.loadFields, true);
            } else {
                $scope.sourcedata.indices = [];
                $scope.sourcedata.fields = [];
            }
        });
    };

    $scope.loadFields = function () {
        var selectedIndices = [];
        if ($scope.suggest.index) {
            selectedIndices.push($scope.suggest.index.name);
        }

        var selectedTypes = [];

        elastic.fields(selectedIndices, selectedTypes, function (data) {
            $scope.sourcedata.fields = data;
        });
    };

    $scope.loadIndices();
}]);

angular.module('guiapp').controller('WhereShardsCtrl',['$scope', '$timeout', 'elastic',
function WhereShardsCtrl($scope, $timeout, elastic) {
    $scope.shardsInfo = {};
    $scope.nodeInfo = {};
    $scope.init = function () {
        obtainShardsInfo();
    };

    function obtainShardsInfo() {
        elastic.obtainShards(function (nodeInfo,data) {
            var nodes = {};
            angular.forEach(data, function (shards, indexName) {
                angular.forEach(shards.shards, function (shardArray,shardKey) {
                    angular.forEach(shardArray, function(shard) {
                        var desc;
                        if (shard.primary) {
                            desc = " (P)";
                        } else {
                            desc = " (R)";
                        }
                        if (!nodes[shard.node]) {
                            nodes[shard.node]={};
                        }
                        if (!nodes[shard.node][indexName]) {
                            nodes[shard.node][indexName]=[];
                        }
                        nodes[shard.node][indexName].push(shard.shard + desc)
                    });
                });
            });
            $scope.nodeInfo = nodeInfo;
            $scope.shardsInfo = nodes;
        });
        $timeout(function() {
            obtainShardsInfo();
        }, 5000);
    }
}]);

(function () {
    'use strict';

    angular.module('guiapp.dashboard')
        .controller('ChangeNumReplicasCtrl', ChangeNumReplicasCtrl);

    ChangeNumReplicasCtrl.$inject = ['$modalInstance', 'indexService'];

    function ChangeNumReplicasCtrl($modalInstance, indexService) {
        var cnrVm = this;
        cnrVm.dialog = {
            "numReplicas": indexService.numReplicas,
            "name": indexService.name
        };

        cnrVm.close = close;

        function close (result) {
            $modalInstance.close(result);
        }

    }
})();
(function () {
    'use strict';

    angular
        .module('guiapp.dashboard')
        .controller('DashboardCtrl', DashboardController);

    DashboardController.$inject = ['$scope','elastic','$modal','indexService'];

    function DashboardController($scope,elastic, $modal, indexService) {
        var vm = this;
        vm.health = {};
        vm.nodes = [];
        vm.plugins = [];
        vm.serverUrl = "";

        vm.closeIndex = closeIndex;
        vm.openIndex = openIndex;
        vm.openChangeReplicas = openChangereplicas;
        vm.removeIndex = removeIndex;

        // TODO jettro: replace with initialisation code according to guideline
        $scope.$on('$viewContentLoaded', function () {
            indexDetails();
            refreshData();
        });

        // Implementations
        function closeIndex(index) {
            elastic.closeIndex(index, function () {
                indexDetails();
            });
        }

        function openIndex (index) {
            elastic.openIndex(index, function () {
                indexDetails();
            });
        }

        function openChangereplicas(index) {
            // TODO jettro: I think this is wrong, need to use a setter function.
            indexService.name = index.name;
            if (!isNaN(parseInt(index.numReplicas)) && isFinite(index.numReplicas)) {
                indexService.numReplicas = parseInt(index.numReplicas);
            }

            var opts = {
                backdrop: true,
                keyboard: true,
                backdropClick: true,
                templateUrl: 'template/dialog/numreplicas.html',
                controller: 'ChangeNumReplicasCtrl',
                controllerAs: 'cnrVm',
                resolve: {
                    fields: function () {
                        return angular.copy(indexService);
                    }
                }
            };
            var modalInstance = $modal.open(opts);
            modalInstance.result.then(function (result) {
                if (result) {
                    elastic.changeReplicas(result.name, result.numReplicas, function () {
                        indexDetails();
                    });
                }
            }, function () {
                // Nothing to do here
            });
        }

        function removeIndex(index) {
            elastic.removeIndex(index, function () {
                indexDetails();
            });
        }

        function indexDetails() {
            elastic.indexesDetails(function (data) {
                vm.indices = data;
            });
        }

        function refreshData() {
            vm.serverUrl = elastic.obtainServerAddress();

            elastic.clusterHealth(function (data) {
                vm.health = data;
            });

            elastic.clusterNodes(function (data) {
                vm.nodes = data;
            });
        }

    }
})();
(function() {
    'use strict';
    angular
        .module('guiapp.dashboard')
        .config(config);

    config.$inject = ['$routeProvider'];

    function config($routeProvider) {
        $routeProvider
            .when('/dashboard', {
                templateUrl: '/partials/dashboard.html',
                controller: 'DashboardCtrl',
                controllerAs: 'vm'
            });
    }
})();

'use strict';

/* Directives */


angular.module('guiapp.directives', []).
        directive('appVersion', ['version', function (version) {
            return function (scope, elm, attrs) {
                elm.text(version);
            };
        }]).
        directive('ngConfirmClick', [
            function () {
                return {
                    link: function (scope, element, attr) {
                        var msg = attr.ngConfirmClick || "Are you sure?";
                        var clickAction = attr.confirmedClick;
                        element.bind('click', function (event) {
                            if (window.confirm(msg)) {
                                scope.$eval(clickAction)
                            }
                        });
                    }
                }
            }
        ]);


(function() {
    'use strict';

    angular
        .module('guiapp')
        .config(ExceptionConfig);

    ExceptionConfig.$inject = ['$provide'];

    function ExceptionConfig($provide) {
        $provide.decorator('$exceptionHandler', ExtendExceptionHandler);
    }

    ExtendExceptionHandler.$inject = ['$delegate','$log'];

    function ExtendExceptionHandler($delegate,$log) {
        return function(exception, cause) {
            $delegate(exception, cause);
            var errorData = {
                exception: exception,
                cause: cause
            };

            $log.error(exception.msg);
        };
    }
})();
'use strict';

/* Filters */

angular.module('guiapp.filters', []).
  filter('interpolate', ['version', function(version) {
    return function(text) {
      return String(text).replace(/\%VERSION\%/mg, version);
    }
  }]);

(function () {
    'use strict';

    angular
        .module('guiapp')
        .controller('GraphCtrl', GraphCtrl);

    GraphCtrl.$inject = ['$modal', 'elastic', 'aggregateBuilder'];

    function GraphCtrl($modal, elastic, aggregateBuilder) {
        var vm = this;
        vm.indices = [];
        vm.types = [];
        vm.fields = [];
        vm.results = [];
        vm.columns = [];
        //vm.aggregate;

        vm.loadIndices = loadIndices;
        vm.loadTypes = loadTypes();
        vm.loadFields = loadFields;
        vm.openDialog = openDialog;
        vm.executeQuery = executeQuery;


        activate();
        function activate() {
            loadIndices();
            loadTypes();
            loadFields();
        }

        function loadIndices() {
            elastic.indexes(function (data) {
                vm.indices = data;
            });
        }

        function loadTypes() {
            elastic.types([], function (data) {
                vm.types = data;
            });
        }

        function loadFields() {
            elastic.fields([], [], function (data) {
                vm.fields = data;
            });
        }

        function openDialog() {
            var opts = {
                backdrop: true,
                keyboard: true,
                backdropClick: true,
                templateUrl: 'template/dialog/aggregate.html',
                controller: 'AggregateDialogCtrl',
                controllerAs: 'adVm',
                resolve: {
                    fields: function () {
                        return angular.copy(vm.fields)
                    }
                }
            };
            var d = $modal.open(opts);
            d.result.then(function (result) {
                if (result) {
                    vm.aggregate = result;
                    executeQuery();
                }
            });
        }

        function executeQuery() {
            var query = createQuery();

            elastic.doSearch(query, function (results) {
                if (vm.aggregate.aggsType === "term") {
                    vm.columns = [];
                    var result = {};
                    angular.forEach(results.aggregations[vm.aggregate.name].buckets, function (bucket) {
                        vm.columns.push({
                            "id": bucket.key,
                            "type": "pie",
                            "name": bucket.key + "[" + bucket.doc_count + "]"
                        });
                        result[bucket.key] = bucket.doc_count;
                    });
                    vm.results = [result];
                } else if (vm.aggregate.aggsType === "datehistogram") {
                    vm.columns = [
                        {"id": "doc_count", "type": "line", "name": "documents"}
                    ];
                    vm.xaxis = {"id": "key"};
                    vm.results = results.aggregations[vm.aggregate.name].buckets;
                } else {
                    vm.columns = [
                        {"id": "doc_count", "type": "bar", "name": "documents"}
                    ];
                    vm.xaxis = {"id": "key"};
                    vm.results = results.aggregations[vm.aggregate.name].buckets;
                }
            }, function (errors) {
                console.log(errors);
            });
        }

        function createQuery() {
            var query = {};
            query.index = "";
            query.body = {};
            query.size = 0;
            query.body.query = {"matchAll": {}};
            var aggregations = [];
            aggregations.push(vm.aggregate);
            query.body.aggs = aggregateBuilder.build(aggregations);

            return query;
        }
    }
})();

(function() {
    'use strict';
    angular
        .module('guiapp.graph')
        .config(config);

    config.$inject = ['$routeProvider'];

    function config($routeProvider) {
        $routeProvider
            .when('/graph', {
                templateUrl: '/partials/graph.html',
                controller: 'GraphCtrl',
                controllerAs: 'vm'
            });
    }
})();

(function () {
    'use strict';


    angular
        .module('guiapp.inspect')
        .controller('InspectCtrl', InspectCtrl);

    InspectCtrl.$inject = ['$scope','$routeParams', '$location', 'elastic'];

    function InspectCtrl($scope, $routeParams, $location, elastic) {
        var vm = this;
        vm.inspect = {};
        vm.inspect.index = '';
        vm.inspect.type = '';
        vm.inspect.id = '';

        vm.sourcedata = {};
        vm.sourcedata.indices = [];
        vm.sourcedata.types = [];

        vm.doInspect = doInspect;
        vm.loadIndices = loadIndices;

        activate();

        function activate() {
            if ($routeParams.id && $routeParams.type && $routeParams.index) {
                vm.inspect.id = $routeParams.id;

                elastic.getDocument($routeParams.index,$routeParams.type,$routeParams.id, function (result) {
                    console.log(result);
                    vm.result = result;
                }, function (errors) {
                    vm.metaResults = {};
                    vm.metaResults.failedShards = 1;
                    vm.metaResults.errors = [];
                    vm.metaResults.errors.push(errors.error);
                });
            }

            loadIndices();

            $scope.$watch('vm.inspect.index', function () {
                loadTypes();
            });

        }

        function doInspect() {
            $location.path("/inspect/" +
                vm.inspect.index.name +
                "/" + vm.inspect.type.name +
                "/" + vm.inspect.id);
        }

        function loadIndices() {
            elastic.indexes(function (data) {
                if (data) {
                    for (var i = 0; i < data.length; i++) {
                        vm.sourcedata.indices[i] = {"name": data[i]};
                        if ($routeParams.index && $routeParams.index == data[i]) {
                            vm.inspect.index = vm.sourcedata.indices[i];
                        }
                    }
                } else {
                    vm.sourcedata.indices = [];
                }
            });
        }

        function loadTypes() {
            elastic.types(vm.inspect.index, function (data) {
                if (data) {
                    for (var i = 0; i < data.length; i++) {
                        vm.sourcedata.types[i] = {"name": data[i]};
                        if ($routeParams.type && $routeParams.type == data[i]) {
                            vm.inspect.type = vm.sourcedata.types[i];
                        }
                    }
                } else {
                    vm.sourcedata.types = [];
                }
            });
        }
    }
})();

(function() {
    'use strict';
    angular
        .module('guiapp.inspect')
        .config(config);

    config.$inject = ['$routeProvider'];

    function config($routeProvider) {
        $routeProvider
            .when('/inspect/:index/:type/:id', {
                templateUrl: '/partials/inspect.html',
                controller: 'InspectCtrl',
                controllerAs: 'vm'
            });
    }
})();
(function () {
    'use strict';

    angular
        .module('guiapp.navbar')
        .controller('ConfigDialogCtrl', ConfigDialogCtrl);

    ConfigDialogCtrl.$inject = ['$modalInstance', 'configuration'];

    function ConfigDialogCtrl($modalInstance, configuration) {
        var confVm = this;
        confVm.configuration = configuration;
        confVm.close = close;

        function close (result) {
            $modalInstance.close(confVm.configuration);
        }
    }
})();
(function () {
    'use strict';
    angular
        .module('guiapp.navbar')
        .controller('NavbarCtrl', NavbarCtrl);

    NavbarCtrl.$inject = ['$timeout', '$modal', 'elastic', 'configuration'];


    function NavbarCtrl($timeout, $modal, elastic, configuration) {
        var vm = this;
        vm.statusCluster = {};
        vm.serverUrl = elastic.obtainServerAddress();
        vm.configureServerUrl = false;
        vm.configure = configuration;

        var items = [];

        vm.addItem = addItem;
        vm.changeServerUrl = changeServerUrl;
        vm.initNavbar = initNavbar;
        vm.openDialog = openDialog;
        vm.select = select;
        vm.selectByUrl = selectByUrl;

        doCheckStatus();

        function addItem(item) {
            items.push(item);
        }

        function select(item) {
            angular.forEach(items, function (item) {
                item.selected = false;
            });
            item.selected = true;
        }

        function selectByUrl(url) {
            angular.forEach(items, function (item) {
                if (item.link == url.split("/")[1]) {
                    select(item);
                }
            });
        }

        function changeServerUrl() {
            elastic.changeServerAddress(vm.serverUrl);
            configuration.excludedIndexes = vm.configure.excludedIndexes;
        }

        function initNavbar() {
            doCheckStatus();
        }

        function openDialog() {
            var opts = {
                backdrop: true,
                keyboard: true,
                backdropClick: true,
                templateUrl: 'template/dialog/config.html',
                controller: 'ConfigDialogCtrl',
                controllerAs: 'confVm',
                resolve: {fields: function () {
                    return angular.copy(configuration);
                } }};
            var modalInstance = $modal.open(opts);
            modalInstance.result.then(function (result) {
                if (result) {
                    elastic.changeServerAddress(result.serverUrl);
                    configuration = angular.copy(result);
                }
            }, function () {
                // Nothing to do here
            });
        }

        function doCheckStatus() {
            elastic.clusterStatus(function (message, status) {
                vm.statusCluster.message = message;
                vm.statusCluster.state = status;
            });
            $timeout(function () {
                doCheckStatus();
            }, 5000); // wait 5 seconds before calling it again
        }
    }
})();
(function() {
    'use strict';

    angular
        .module('guiapp.navbar')
        .directive('navbar', ['$location', function ($location) {
            return {
                restrict: 'E',
                transclude: true,
                scope: {heading: '@'},
                controller: 'NavbarCtrl',
                controllerAs: 'vm',
                templateUrl: 'template/navbar/navbar.html',
                replace: true,
                link: function ($scope, $element, $attrs, navbarCtrl) {
                    $scope.$location = $location;
                    $scope.$watch('$location.path()', function (locationPath) {
                        navbarCtrl.selectByUrl(locationPath)
                    });
                }
            }
        }])
        .directive('navbaritem', [function () {
            return {
                require:'^navbar',
                restrict: 'E',
                templateUrl: 'template/navbar/navbaritem.html',
                replace: true,
                scope:{"theLink":"@link","theTitle":"@title"},
                link: function ($scope, $element, $attrs, navbarCtrl) {
                    $scope.item={"title": $attrs['title'], "link": $attrs['link'], "selected": false};
                    navbarCtrl.addItem($scope.item);
                }
            }
        }])
        .directive('navbardropdownitem', [function () {
            return {
                require:'^navbar',
                restrict: 'E',
                scope:{"theLink":"@link","theTitle":"@title"},
                templateUrl: 'template/navbar/navbardropdownitem.html',
                replace: true,
                link: function ($scope, $element, $attrs, navbarCtrl) {
//                    $scope.item={"title": $attrs['title'], "link": $attrs['link'], "selected": false};
//                    navbarCtrl.addItem($scope.item);
                }
            }
        }])
        .directive('navbardropdown', [function () {
            return {
                require:'^navbar',
                restrict: 'E',
                transclude: true,
                scope:{"theTitle":"@title","theLink":"@link"},
                templateUrl: 'template/navbar/navbardropdown.html',
                replace: true,
                link: function ($scope, $element, $attrs, navbarCtrl) {
                    $scope.item={"title": $scope.theTitle, "link": $scope.theLink, "selected": false};
                    navbarCtrl.addItem($scope.item);
                }
            }
        }]);

})();

(function () {
    'use strict';

    angular
        .module('guiapp.nodeinfo')
        .controller('NodeInfoCtrl', NodeInfoCtrl);

    NodeInfoCtrl.$inject = ['elastic', '$routeParams'];

    function NodeInfoCtrl(elastic, $routeParams) {
        var vm = this;

        var nodeId = $routeParams.nodeId;

        activate();

        function activate() {
            elastic.nodeInfo(nodeId, function (data) {
                vm.nodes = data;
            });
        }
    }
})();

(function() {
    'use strict';
    angular
        .module('guiapp.nodeinfo')
        .config(config);

    config.$inject = ['$routeProvider'];

    function config($routeProvider) {
        $routeProvider
            .when('/node/:nodeId', {
                templateUrl: '/partials/node.html',
                controller: 'NodeInfoCtrl',
                controllerAs: 'vm'
            });
    }
})();
(function () {
    'use strict';

    angular
        .module('guiapp.search')
        .controller('SearchCtrl', SearchCtrl);

    SearchCtrl.$inject = ['elastic', 'configuration', 'aggregateBuilder', '$modal', 'queryStorage'];

    function SearchCtrl(elastic, configuration, aggregateBuilder, $modal, queryStorage) {
        var vm = this;
        vm.isCollapsed = true; // Configuration div
        vm.configure = configuration;
        vm.fields = [];
        vm.search = {};
        vm.search.advanced = {};
        vm.search.advanced.searchFields = [];
        vm.search.aggs = {};
        vm.search.selectedAggs = [];
        vm.configError = "";
        vm.results = [];
        vm.aggs = [];
        vm.tokensPerField = [];
        vm.metaResults = {};

        // initialize pagination
        vm.currentPage = 1;
        vm.maxSize = 5;
        vm.numPages = 0;
        vm.pageSize = 10;
        vm.totalItems = 0;

        vm.addFilter = addFilter;
        vm.addRangeFilter = addRangeFilter;
        vm.addSearchField = addSearchField;
        vm.changePage = changePage;
        vm.checkSelectedAggregate = checkSelectedAggregate;
        vm.checkSelectedRangeAggregate = checkSelectedRangeAggregate;
        vm.doSearch = doSearch;
        vm.init = init;
        vm.loadQuery = loadQuery;
        vm.obtainAggregateByKey = obtainAggregateByKey;
        vm.openDialog = openDialog;
        vm.removeFilter = removeFilter;
        vm.removeRangeFilter = removeRangeFilter;
        vm.removeSearchField = removeSearchField;
        vm.restartSearch = restartSearch;
        vm.removeAggregateField = removeAggregateField;
        vm.saveQuery = saveQuery;
        vm.showAnalysis = showAnalysis;

        function changePage () {
            vm.doSearch();
        }

        function init () {
            elastic.fields([], [], function (data) {
                vm.fields = data;
                if (!vm.configure.title) {
                    if (vm.fields.title) {
                        vm.configure.title = "title";
                    }
                }

                if (!vm.configure.description && vm.fields.description) {
                    vm.configure.description = "description";
                }
            });
        }

        function restartSearch() {
            vm.currentPage = 1;
            vm.numPages = 0;
            vm.pageSize = 10;
            vm.totalItems = 0;
            vm.tokensPerField = [];
            vm.doSearch();
        }

        function doSearch () {
            if ((!(vm.configure.title)) || (!(vm.configure.description))) {
                vm.configError = "Please configure the title and description in the configuration at the top of the page.";
            } else {
                vm.configError = "";
            }

            var query = {};
            query.index = "";
            query.body = {};

            query.size = vm.pageSize;
            query.from = (vm.currentPage - 1) * vm.pageSize;

            query.body.aggs = aggregateBuilder.build(vm.search.aggs);
            var filter = filterChosenAggregatePart();
            if (filter) {
                query.body.query = {"filtered": {"query": searchPart(), "filter": filter}};
            } else {
                query.body.query = searchPart();
            }

            elastic.doSearch(query, function (results) {
                vm.results = results.hits;
                vm.aggs = results.aggregations;
                vm.numPages = Math.ceil(results.hits.total / vm.pageSize);
                vm.totalItems = results.hits.total;

                vm.metaResults.totalShards = results._shards.total;
                if (results._shards.failed > 0) {
                    vm.metaResults.failedShards = results._shards.failed;
                    vm.metaResults.errors = [];
                    angular.forEach(results._shards.failures, function (failure) {
                        vm.metaResults.errors.push(failure.index + " - " + failure.reason);
                    });

                }
            }, handleErrors);
        }

        function addSearchField () {
            var searchField = {};
            searchField.field = vm.search.advanced.newField;
            searchField.text = vm.search.advanced.newText;
            vm.search.advanced.searchFields.push(searchField);
        }

        function removeSearchField(index) {
            vm.search.advanced.searchFields.splice(index, 1);
        }

        function openDialog() {
            var opts = {
                backdrop: true,
                keyboard: true,
                backdropClick: true,
                templateUrl: 'template/dialog/aggregate.html',
                controller: 'AggregateDialogCtrl',
                controllerAs: 'adVm',
                resolve: {
                    fields: function () {
                        return angular.copy(vm.fields)
                    }
                }
            };
            var modalInstance = $modal.open(opts);
            modalInstance.result.then(function (result) {
                if (result) {
                    vm.search.aggs[result.name] = result;
                }
            }, function () {
                // Nothing to do here
            });
        }

        function removeAggregateField(name) {
            delete vm.search.aggs[name];
        }

        function saveQuery() {
            queryStorage.saveSearch(angular.copy(vm.search));
        }

        function loadQuery() {
            queryStorage.loadSearch(function (data) {
                vm.search = angular.copy(data);
            });
        }

        function addFilter(key, value) {
            if (!vm.search.selectedAggs) {
                vm.search.selectedAggs = [];
            }
            vm.search.selectedAggs.push({"key": key, "value": value});
            vm.doSearch();
        }

        function addRangeFilter(key, from, to) {
            if (!vm.search.selectedAggs) {
                vm.search.selectedAggs = [];
            }
            vm.search.selectedAggs.push({"key": key, "from": from, "to": to});
            vm.doSearch();
        }

        function checkSelectedAggregate(key, value) {
            if (!vm.search.selectedAggs) {
                return false;
            }
            for (var i = 0; i < vm.search.selectedAggs.length; i++) {
                var selectedAggregate = vm.search.selectedAggs;
                if (selectedAggregate[i].key === key && selectedAggregate[i].value === value) {
                    return true;
                }
            }
            return false;
        }

        function checkSelectedRangeAggregate(key, from, to) {
            if (!vm.search.selectedAggs) {
                return false;
            }
            for (var i = 0; i < vm.search.selectedAggs.length; i++) {
                var selectedAggregate = vm.search.selectedAggs;
                if (selectedAggregate[i].key === key && selectedAggregate[i].from === from && selectedAggregate[i].to === to) {
                    return true;
                }
            }
            return false;
        }

        function removeFilter(key, value) {
            if (!vm.search.selectedAggs) {
                return;
            }
            for (var i = 0; i < vm.search.selectedAggs.length; i++) {
                var selectedAggregate = vm.search.selectedAggs;
                if (selectedAggregate[i].key === key && selectedAggregate[i].value === value) {
                    vm.search.selectedAggs.splice(i, 1);
                }
            }
            vm.doSearch();
        }

        function removeRangeFilter(key, from, to) {
            if (!vm.search.selectedAggs) {
                return;
            }
            for (var i = 0; i < vm.search.selectedAggs.length; i++) {
                var selectedAggregate = vm.search.selectedAggs;
                if (selectedAggregate[i].key === key && selectedAggregate[i].from === from && selectedAggregate[i].to === to) {
                    vm.search.selectedAggs.splice(i, 1);
                }
            }
            vm.doSearch();
        }

        function obtainAggregateByKey(key) {
            for (var i = 0; i < vm.search.aggs.length; i++) {
                var currentAggregate = vm.search.aggs[i];
                if (currentAggregate.field === key) {
                    return currentAggregate;
                }
            }
            return null;
        }

        function showAnalysis(index, type, id) {
            vm.tokensPerField = {"id": index + type + id};
            elastic.documentTerms(index, type, id, function (result) {
                vm.tokensPerField.tokens = result;
            });
        }

        function searchPart() {
            var executedQuery;
            if (vm.search.doAdvanced && vm.search.advanced.searchFields.length > 0) {
                var tree = {};
                for (var i = 0; i < vm.search.advanced.searchFields.length; i++) {
                    var searchField = vm.search.advanced.searchFields[i];
                    var fieldForSearch = vm.fields[searchField.field];
                    recurseTree(tree, searchField.field, searchField.text);
                    if (fieldForSearch.nestedPath) {
                        defineNestedPathInTree(tree, fieldForSearch.nestedPath, fieldForSearch.nestedPath);
                    }
                }
                executedQuery = constructQuery(tree);

            } else if (vm.search.simple && vm.search.simple.length > 0) {
                executedQuery = {
                    "simple_query_string": {
                        "query": vm.search.simple,
                        "fields": ["_all"],
                        "analyzer": "snowball"
                    }
                };
            } else {
                executedQuery = {"matchAll": {}};
            }

            return executedQuery;
        }

        function constructQuery(tree) {
            var props = Object.getOwnPropertyNames(tree);
            var boolQuery = {};
            boolQuery.bool = {};
            boolQuery.bool.must = [];
            for (var i = 0; i < props.length; i++) {
                var prop = props[i];
                if (tree[prop] instanceof Object) {
                    boolQuery.bool.must.push(constructQuery(tree[prop]));
                } else if (!(prop.substring(0, 1) === "_")) {
                    var fieldName = prop;
                    if (tree._nested) {
                        fieldName = tree._nested + "." + fieldName;
                    }
                    var matchQuery = {};
                    matchQuery[fieldName] = tree[prop];
                    boolQuery.bool.must.push({"match": matchQuery});
                }
            }

            var returnQuery;
            if (tree._nested) {
                var nestedQuery = {};
                nestedQuery.nested = {};
                nestedQuery.nested.path = tree._nested;
                nestedQuery.nested.query = boolQuery;
                returnQuery = nestedQuery;
            } else {
                returnQuery = boolQuery;
            }

            return returnQuery;
        }

        function defineNestedPathInTree(tree, path, nestedPath) {
            var pathItems = path.split(".");
            if (pathItems.length > 1) {
                defineNestedPathInTree(tree[pathItems[0]], pathItems.splice(1).join("."), nestedPath);
            } else {
                tree[path]._nested = nestedPath;
            }

        }

        function recurseTree(tree, newKey, value) {
            var newKeys = newKey.split(".");

            if (newKeys.length > 1) {
                if (!tree.hasOwnProperty(newKeys[0])) {
                    tree[newKeys[0]] = {};
                }
                recurseTree(tree[newKeys[0]], newKeys.splice(1).join("."), value);
            } else {
                if (!tree.hasOwnProperty(newKey)) {
                    tree[newKey] = value;
                }
            }
        }


        function filterChosenAggregatePart() {
            if (vm.search.selectedAggs && vm.search.selectedAggs.length > 0) {
                var filterQuery = {};
                var selectedAggs = vm.search.selectedAggs;
                var filters = [];
                for (var i = 0; i < selectedAggs.length; i++) {
                    var aggregate = vm.search.aggs[selectedAggs[i].key];
                    var aggregateType = aggregate.aggsType;
                    if (aggregateType === "term") {
                        var termFilter = {"term": {}};
                        termFilter.term[vm.search.aggs[selectedAggs[i].key].field] = selectedAggs[i].value;
                        filters.push(termFilter);
                    } else if (aggregateType === "datehistogram") {
                        var fromDate = new Date(selectedAggs[i].value);
                        if (aggregate.interval === 'year') {
                            fromDate.setFullYear(fromDate.getFullYear() + 1);
                        } else if (aggregate.interval === 'month') {
                            fromDate.setMonth(fromDate.getMonth() + 1);
                        } else if (aggregate.interval === 'week') {
                            fromDate.setDate(fromDate.getDate() + 7);
                        } else if (aggregate.interval === 'day') {
                            fromDate.setDate(fromDate.getDate() + 1);
                        } else if (aggregate.interval === 'hour') {
                            fromDate.setHours(fromDate.getHours() + 1);
                        } else if (aggregate.interval === 'minute') {
                            fromDate.setMinutes(fromDate.getMinutes() + 1);
                        }
                        var rangeFilter = {"range": {}};
                        rangeFilter.range[vm.search.aggs[selectedAggs[i].key].field] = {
                            "from": selectedAggs[i].value,
                            "to": fromDate.getTime()
                        };
                        filters.push(rangeFilter);
                    } else if (aggregateType === "histogram") {
                        var rangeFilter = {"range": {}};
                        var currentAgg = vm.search.aggs[selectedAggs[i].key];
                        rangeFilter.range[currentAgg.field] = {
                            "from": selectedAggs[i].value,
                            "to": selectedAggs[i].value + currentAgg.interval - 1
                        };
                        filters.push(rangeFilter);
                    } else if (aggregateType === "range") {
                        var rangeFilter = {"range": {}};
                        var currentAgg = vm.search.aggs[selectedAggs[i].key];
                        rangeFilter.range[currentAgg.field] = {
                            "from": selectedAggs[i].from,
                            "to": selectedAggs[i].to
                        };
                        filters.push(rangeFilter);
                    }
                }
                filterQuery.and = filters;

                return filterQuery;
            }
            return null;
        }

        function handleErrors(errors) {
            vm.metaResults.failedShards = 1;
            vm.metaResults.errors = [];
            if (errors.message && typeof errors.message === "object") {
                if (errors.message.hasOwnProperty('message')) {
                    vm.metaResults.errors.push(errors.message.message);
                }
            } else {
                vm.metaResults.errors.push(errors.message);
            }
        }
    }
})();

(function() {
    'use strict';
    angular
        .module('guiapp.search')
        .config(config);

    config.$inject = ['$routeProvider'];

    function config($routeProvider) {
        $routeProvider
            .when('/search', {
                templateUrl: '/partials/search.html',
                controller: 'SearchCtrl',
                controllerAs: 'vm'
            });
    }
})();
(function () {
    'use strict';

    angular
        .module('guiapp.snapshot')
        .controller('CreateSnapshotCtrl', CreateSnapshotCtrl);

    CreateSnapshotCtrl.$inject = ['$modalInstance'];

    function CreateSnapshotCtrl($modalInstance) {
        var csVm = this;
        csVm.dialog = {"includeGlobalState": true, "ignoreUnavailable": false};

        csVm.close = close;

        function close(result) {
            $modalInstance.close(result);
        }
    }
})();

(function () {
    'use strict';

    angular
        .module('guiapp.snapshot')
        .controller('CreateSnapshotRepositoryCtrl', CreateSnapshotRepositoryCtrl);

    CreateSnapshotRepositoryCtrl.$inject = ['$modalInstance'];

    function CreateSnapshotRepositoryCtrl($modalInstance) {
        var csrVm = this;
        csrVm.dialog = {};

        csrVm.close = close;

        function close(result) {
            $modalInstance.close(result);
        }

    }
})();

(function () {
    'use strict';

    angular.module('guiapp.snapshot')
        .controller('SnapshotCtrl', SnapshotCtrl);

    SnapshotCtrl.$inject = ['$scope', 'elastic', '$modal'];

    function SnapshotCtrl($scope,elastic, $modal) {
        var vm = this;
        vm.repositories = [];
        vm.selectedRepository = "";
        vm.snapshots = [];
        vm.snapshotsStatus = false;

        vm.listSnapshots = listSnapshots;
        vm.selectRepository = selectRepository;
        vm.deleteRepository = deleteRepository;
        vm.listrepositories = listRepositories;
        vm.removeSnapshot = removeSnapshot;
        vm.removeSnapshotFromRepository = removeSnapshotFromRepository;
        vm.restoreSnapshot = restoreSnapshot;
        vm.openCreateSnapshot = openCreateSnapshot;
        vm.openCreateSnapshotRepository = openCreateSnapshotRepository;

        activate();

        $scope.$watch('vm.selectedRepository', function () {
            listSnapshots();
        });

        function activate() {
            listRepositories();
        }

        function listRepositories() {
            elastic.snapshotRepositories(function (data) {
                vm.repositories = data;
            });
        }

        function selectRepository(name) {
            vm.selectedRepository = name;
        }

        function deleteRepository(name) {
            elastic.deleteRepository(name, function (data) {
                if (vm.selectedRepository === name) {
                    vm.selectedRepository = "";
                }
                listRepositories();
            });
        }

        function listSnapshots() {
            if (vm.selectedRepository !== "") {
                elastic.obtainSnapshotStatus(function (snapshots) {
                    if (snapshots.length > 0) {
                        vm.snapshotsStatus = true;
                        vm.snapshots = snapshots;

                    } else {
                        elastic.obtainSnapshots(vm.selectedRepository, function (snapshots) {
                            vm.snapshotsStatus = false;
                            vm.snapshots = snapshots;
                        });
                    }
                });
            }
        }

        function removeSnapshot(snapshot) {
            elastic.removeSnapshot(vm.selectedRepository, snapshot, function () {
                listSnapshots();
            });
        }

        function removeSnapshotFromRepository(repository, snapshot) {
            elastic.removeSnapshot(repository, snapshot, function () {
                listSnapshots();
            });
        }

        function restoreSnapshot(snapshot) {
            elastic.restoreSnapshot(vm.selectedRepository, snapshot, function () {
                listSnapshots();
            });
        }

        function openCreateSnapshot() {
            var opts = {
                backdrop: true,
                keyboard: true,
                backdropClick: true,
                templateUrl: 'template/dialog/createsnapshot.html',
                controller: 'CreateSnapshotCtrl',
                controllerAs: 'csVm'
            };
            var modalInstance = $modal.open(opts);
            modalInstance.result.then(function (result) {
                if (result) {
                    var newSnapshot = {};
                    newSnapshot.repository = vm.selectedRepository;
                    if (result.name) {
                        newSnapshot.snapshot = result.name;
                    } else {
                        var now = moment().format("YYYYMMDDHHmmss");
                        newSnapshot.snapshot = result.prefix + "-" + now;
                    }
                    newSnapshot.indices = result.indices;
                    newSnapshot.ignoreUnavailable = result.ignoreUnavailable;
                    newSnapshot.includeGlobalState = result.includeGlobalState;
                    elastic.createSnapshot(newSnapshot, function () {
                        listSnapshots();
                    });
                }
            }, function () {
                // Nothing to do here
            });
        }

        function openCreateSnapshotRepository() {
            var opts = {
                backdrop: true,
                keyboard: true,
                backdropClick: true,
                templateUrl: 'template/dialog/createsnapshotrepository.html',
                controller: 'CreateSnapshotRepositoryCtrl',
                controllerAs: 'csrVm'
            };
            var modalInstance = $modal.open(opts);
            modalInstance.result.then(function (result) {
                if (result) {
                    elastic.createRepository(result, function () {
                        listRepositories();
                        vm.selectedRepository = "";
                    });
                }
            }, function () {
                // Nothing to do here
            });
        }
    }
})();

(function() {
    'use strict';
    angular
        .module('guiapp.snapshot')
        .config(config);

    config.$inject = ['$routeProvider'];

    function config($routeProvider) {
        $routeProvider
            .when('/tools/snapshots', {
                templateUrl: '/partials/snapshots.html',
                controller: 'SnapshotCtrl',
                controllerAs: 'vm'
            });
    }
})();