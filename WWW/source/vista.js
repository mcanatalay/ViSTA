vista = function(
        listener,
        mapContainer,
        size         
        ){
    
    /* Global Variables STARTS */
    var mapOptions = {
        nodes: {
            shape: 'dot',
            borderWidth: 2
        },
        interaction: {
            hover: false,
            selectable: false,
            dragNodes: false,
            dragView: false,
            zoomView: false
        },
        physics: false
    };
    
    var mapData = {
        nodes: new vis.DataSet(),
        edges: new vis.DataSet()
    };
    
    var map = new vis.Network(mapContainer, mapData, mapOptions);
    
    var data = {
        headerConvention: ["index","timestamp","fixDuration","posX","posY","stimuliName"],
        outScreenStrings: ["ScreenRec","No media","undefined"],
        lastFileID: -1,
        AOIs: new Array(),
        categories: new Array(),
        main: new Array(),
        firstClick: null
    };
        
    /* Global Variables ENDS */
    
    /* File Module Functions STARTS */
        
    this.readFile = function(file){
        if(file.files && file.files.length > 0){

            for(var i = 0; file.files.length > i; i++){
                var reader = new FileReader();
                reader.onload = fileLoader;
               
                reader.readAsText(file.files[i]);
            }
        }
    };
    
    var fileLoader = function(event){
        data.lastFileID++;

        var fileContent = event.target.result;	
        var lines = fileContent.split(/\r\n/);
        
        var fileHeaders = new Array();
        fileHeaders = lines[0].split(/\t/);

        var fileData = new Array();
        for(var i = 1; lines.length > i; i++){
            var temp = lines[i].split(/\t/);
            if(temp != ""){
                fileData[i-1] = new Object();

                for(var k = 0; temp.length > k; k++){
                    var indexName = fileHeaders[k];
                    fileData[i-1][indexName] = temp[k];
                }
            }
        }

        parseData(projectData(fileHeaders, fileData,
                ["index","timestamp","fixDuration","posX","posY","stimuliName"]),data.lastFileID);
    };
    
    /* File Module Functions ENDS */
    
    /* Data Module Functions STARTS */
    
    function projectData(fileHeaders, fileData, originalHeaders){
        var projectedData = new Array();

        for(var i = 0; fileData.length > i; i++){
            projectedData[i] = new Object(); 
            for(var j  = 0; originalHeaders.length > j; j++){
                var newIndexName = originalHeaders[j];
                var oldIndexName = fileHeaders[j];

                projectedData[i][newIndexName] = fileData[i][oldIndexName];
            }
        }

        return projectedData;
    }
    
    function parseData(projectedData,fileID){
        var lastCategoryName = "";

        for(var i = 0; projectedData.length > i; i++){
            var categoryName = projectedData[i][data.headerConvention[5]];

            if(checkCategoryName(categoryName)){
                if(!isCategoryExist(categoryName)){
                    data.categories.push({name: categoryName, title: null, img: null, participants: [fileID]});
                    data.main[categoryName] = new vis.DataSet();
                    fetchPageTitleToData(categoryName);
                } else if(!isParticipantExistInCategory(categoryName,fileID)){
                    data.categories[findCategoryIndex(categoryName)].participants.push(fileID);
                }

                var lastIndex = data.main[categoryName].add(projectedData[i]);
                var isConnected = (lastCategoryName == categoryName ? true : false);
                data.main[categoryName].update({id: lastIndex, participantID: fileID, isConnected: isConnected});
            }
            
            lastCategoryName = categoryName;
        }
        listener("DATACHANGE");
    }
    
    /* Data Module Functions ENDS */
    
    /* Category Functions STARTS */
    
    function isCategoryExist(categoryName){
        for(var i = 0; data.categories.length > i; i++){
            if(data.categories[i].name == categoryName){
                return true;
            }
        }

        return false;
    }
    
    function findCategoryIndex(categoryName){
        var categoryIndex;
        for(categoryIndex = 0; data.categories[categoryIndex].name != categoryName; categoryIndex++);

        return categoryIndex;
    };

    function checkCategoryName(categoryName){
        for(var i = 0; data.outScreenStrings.length > i; i++){
            if(data.outScreenStrings[i] == categoryName){
                return false;
            }
        }

        return true;
    }
    
    function isParticipantExistInCategory(categoryName, participantID){
        var categoryIndex = findCategoryIndex(categoryName);
        for(var i = 0; data.categories[categoryIndex].participants.length > i; i++){
            if(data.categories[categoryIndex].participants[i] == participantID){
                return true;
            }
        }

        return false;
    }
    
    /* Category Functions ENDS */
    
    /* Visualization Module Functions STARTS */
    
    function createVisualMap(visualizationData){
        mapData.nodes.clear();
        mapData.edges.clear();

        mapData.nodes.update(visualizationData.nodes);
        mapData.edges.update(visualizationData.edges);
    }
    
    this.showGazePath = function(stimuliName, filter = null){
        listener("LOADERSTART");
        fetchBackgroundImage(stimuliName);
        createVisualMap(createGazePath(stimuliName, filter));        
    };
    
    function createGazePath(stimuliName, filter){
        var stimuliData;
        if(filter != null){
            stimuliData = data.main[stimuliName].get({
                filter: function (stimuliInstant) {
                    return filterStimuli(stimuliInstant,filter) ;
                }
            });
        } else{
            stimuliData = data.main[stimuliName].get();
        }
        
        var nodes = new Array();
        var edges = new Array();
        
        for(var i=0; stimuliData.length > i; i++){
            nodes.push(convertToVisualNode(i,stimuliData[i]));

            if(i > 0 && stimuliData[i]["isConnected"] == true){
                edges.push({
                   from: i-1,
                   to: i
                });
            }
        }
        return {nodes, edges};
    }
    
    function convertToVisualNode(index, stimuliInstant){       
       return {
         id: index,
         label: stimuliInstant[data.headerConvention[0]],
         value: toRealValue(parseInt(stimuliInstant[data.headerConvention[2]])),
         x: toRealX(parseInt(stimuliInstant[data.headerConvention[3]])),
         y: toRealY(parseInt(stimuliInstant[data.headerConvention[4]])),
         group: parseInt(stimuliInstant["participantID"])
       };
    }
    
    function toRealX(x){ return x*(size.width/size.dataW); }
    function toRealY(y){ return y*(size.height/size.dataH); }
    function toDataX(x){ return x*(size.dataW/size.width); }
    function toDataY(y){ return y*(size.dataH/size.height); }
    function toRealValue(value){ return value * ((size.width/size.dataW) + (size.height/size.dataH))/2 };
    
    /* Visualization Module Functions ENDS */
    
    /* WEBPAGE API Module Functions STARTS */
    
    this.getListOfCategories = function(){
        return data.categories;
    }
    
    /* WEBPAGE API Module Functions ENDS */
    
    /* Misc. Module Functions STARTS */
        
    function fetchBackgroundImage(imgAddress){
        var categoryIndex = findCategoryIndex(imgAddress);
        if(data.categories[categoryIndex].img == null){
            html2canvas(imgAddress,{
                proxy: "proxy.php",
                allowTaint: true,
                width: size.dataW,
                height: size.dataH,
            }
            ).then(function(canvas) {
                var img = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
                $('#map').css('background-image', 'url(' + img + ')');
                data.categories[categoryIndex].img = img;
                listener("LOADEREND");
            });
        } else{
            $('#map').css('background-image', 'url(' + data.categories[categoryIndex].img + ')');
            listener("LOADEREND");
        }
    }
    
    function fetchPageTitleToData(titleAddress){
        var title;
        $.ajax({
            url: "proxy.php?url="+titleAddress,
            success: function(data) {
                var matches = data.match(/<title>(.*?)<\/title>/);
                if(matches == null){
                    title = titleAddress;
                } else{
                    title = matches[1];
                }
            },
            async: false
        });
        data.categories[findCategoryIndex(titleAddress)].title = title;
        listener("DATACHANGE");
    }
    
    function isPointAvailable(x,y){
        for(var i = 0; data.AOIs.length > i; i++){
            var area = data.AOIs[i];
            if(x > area.startX && y > area.startY &&
                x < area.endX && y < area.endY){
                return false;
            } else{
                return true;
            }
        }
        return true;
    }
    
    function filterStimuli(stimuliInstant,filter){
        var flag = true;
        
        if(filter.participants.indexOf(stimuliInstant.participantID) != -1){
            flag = true;
        } else{
            flag = false;
        }
        
        return flag;
    }
    
    /* Misc. Module Functions ENDS */
    
    /* Other Modules Functions STARTS */
    
    /* STA Module Functions STARTS */
    this.showSTAMap = function(stimuliName, settings, filter){
        createVisualMap(createSTAMap(getSTAData(stimuliName,settings,filter)));
    };
    
    this.isSTAMAPApplicable = function(){
        if(data.AOIs.length > 1){
            return true;
        }
        return false;
    };

    var createSTAMap = function(staSequence){
        var areaWeights = new Array();
        var areaNodes = new Array();
        var areaEdges = new vis.DataSet();
        for(var i = 0; data.AOIs.length > i; i++){
            areaWeights[i] = 0;
        }

        for(var i = 0; staSequence.length > i; i++){
            areaWeights[parseInt(staSequence[i])]++;
            if(staSequence.length > i+1){
                var id = staSequence[i] + "-" + staSequence[i+1];
                var label = areaEdges.get(id);
                if(label == null){
                    label = String(i+1);
                } else{
                    label = label.label + ", " + String(i+1);
                }
                areaEdges.update({id: id, from: parseInt(staSequence[i]), to: parseInt(staSequence[i+1]),
                    label: label, arrows: "to",
                    smooth: {enabled: true, type: "continuous"}
                });
            }
        }

        for(var i = 0; areaWeights.length > i; i++){
            var area = data.AOIs[i];
            var x = area.startX + area.lengthX/2;
            var y = area.startY + area.lengthY/2;
            areaNodes.push({id: i, x: x, y: y, value: areaWeights[i], group: i, label: i});
        }

        return {nodes: areaNodes, edges: areaEdges.get()};
    };

    function getSTAData(stimuliName, settings, filter){
        var staInputData = new Object();

        for(var i = 0; filter.participants.length > i; i++){
            var participant = filter.participants[i];
            staInputData[participant] = data.main[stimuliName].get({
                filter: function (stimuliInstant) {
                    return stimuliInstant.participantID == participant && filterStimuli(stimuliInstant,filter);
                }
            });
        }

        var postData = {
            areaData: data.AOIs,
            rawData: staInputData,
            settings: settings
        };
        
        var jsondata = JSON.stringify(postData);
        var dataResponse;
        
        $.ajax({
            type: "POST",
            url: 'sockets/client.php',
            data: {jsondata: jsondata},
            success: function(response){
                dataResponse = response;
            },
            async: false
        });
        
        return JSON.parse(dataResponse);
    }
    /* STA Module Functions ENDS */
    
    /* Other Modules Functions ENDS */
    
    /* Function Calls  STARTS */
    map.moveTo({
        position: {x: 0, y:0},
        offset: {x: -1*size.width/2, y: -1*size.height/2},
        scale: 1
    });


    map.on("click", function (params) {
        var currentClick = params.pointer.canvas;
        if(isPointAvailable(currentClick.x, currentClick.y)){
            if(data.firstClick == null){
                data.firstClick = currentClick;
            } else{
                var startX, startY, lengthX, lengthY;
                if(data.firstClick.x > currentClick.x){
                    startX = currentClick.x;
                    lengthX = data.firstClick.x - currentClick.x;
                } else{
                    startX = data.firstClick.x;
                    lengthX = currentClick.x - data.firstClick.x;
                }

                if(data.firstClick.y > currentClick.y){
                    startY = currentClick.y;
                    lengthY = data.firstClick.y - currentClick.y;
                } else{
                    startY = data.firstClick.y;
                    lengthY = currentClick.y - data.firstClick.y;
                }
                
                data.AOIs.push({
                    index: data.AOIs.length,
                    startX: toDataX(startX),
                    lengthX: toDataX(lengthX),
                    startY: toDataY(startY),
                    lengthY: toDataY(lengthY)
                });
                console.log(data.AOIs);
                data.firstClick = null;
                
                listener("CHECKVISMETHOD");
            }
        }
    });

    map.on("doubleClick", function (params) {
        data.firstClick = [];
    });
    
    this.removeAOIs = function(){
        data.AOIs = [];
    }
    
    /* Function Calls ENDS */
};
