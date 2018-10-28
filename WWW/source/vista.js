vista = function(
        listener,
        mapContainer,
        size,
        staAddress
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
        firstClick: null,
        AOIBlock: false,
        download: null
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
                    data.categories.push({name: categoryName, title: null, img: null, height: 0,
                        color: getRandomColor(), participants: [fileID]});
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
    
    function filterStimuli(stimuliInstant,filter){
        var flag = true;
        
        if(filter.participants.indexOf(stimuliInstant.participantID) != -1){
            flag = true;
        } else{
            flag = false;
        }
        
        return flag;
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
        if(filter != null && filter.img != null){
            console.log("hello 2");
            fetchBackgroundImage(stimuliName, filter.img);
        } else{
            fetchBackgroundImage(stimuliName);
        }
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
         group: parseInt(stimuliInstant["participantID"]),
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
        
    function fetchBackgroundImage(imgAddress, imgExternal = null){
        var categoryIndex = findCategoryIndex(imgAddress);
        
        if(data.categories[categoryIndex].img != null){
            $('#background').height(size.height);
            $('#background').css('background-image', 'url(' + data.categories[categoryIndex].img + ')');
            
            listener("LOADEREND");
            
        } else if(imgExternal != null){
            var cropIMG = new Image();
            cropIMG.crossOrigin = "Anonymous";
            cropIMG.onload = function(){
                var cropCanvas = document.createElement('canvas');
                var cropContext = cropCanvas.getContext('2d');
                cropCanvas.width = size.width;
                cropCanvas.height = size.height;
                
                var cropHeight = (cropIMG.height > size.height)? size.height:cropIMG.height;
                cropContext.drawImage(cropIMG, 0, 0, cropIMG.width, cropHeight, 0, 0, size.width, size.height);
                
                var img = cropCanvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
                $('#background').height(size.height);
                $('#background').css('background-image', 'url(' + img + ')');
                data.categories[categoryIndex].img = img;
                data.categories[categoryIndex].height = cropIMG.height;
                
                listener("LOADEREND");
            }
            cropIMG.src = imgExternal;
            
        } else if(data.categories[categoryIndex].img == null){
            html2canvas(imgAddress,{
                proxy: "proxy.php",
                allowTaint: true,
                width: size.dataW,
                height: size.dataH,
            }
            ).then(function(canvas) {
                //Cropping
                var cropCanvas = document.createElement('canvas');
                var cropContext = cropCanvas.getContext('2d');
                cropCanvas.width = size.width;
                cropCanvas.height = size.height;
                
                var cropHeight = (canvas.height > size.height)? size.height:canvas.height;
                cropContext.drawImage(canvas, 0, 0, canvas.width, cropHeight, 0, 0, size.width, size.height);
                
                var img = cropCanvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
                $('#background').height(size.height);
                $('#background').css('background-image', 'url(' + img + ')');
                data.categories[categoryIndex].img = img;
                data.categories[categoryIndex].height = canvas.height;
                
                listener("LOADEREND");
            });
        } else{
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
            var endX = area.startX + area.lengthX;
            var endY = area.startY + area.lengthY;
            if(x > area.startX && y > area.startY &&
                x < endX && y < endY){
                return false;
            } else{
                return true;
            }
        }
        return true;
    }
    
    function generateAOIIndex(){
        var max = 0;
        for(var i = 0; data.AOIs.length > i; i++){
            if(data.AOIs[i].index > max){
                max = data.AOIs[i].index;
            }
        }
        return max+1;
    }
    
    function getAOIIndex(index){
        var i;
        for(i = 0; data.AOIs.length > i && data.AOIs[i].index != index; i++);
        
        return (i != data.AOIs.length)? i:-1;
    }
    
    this.addAOIBlock = function(AOIBlock){
        data.AOIBlock = AOIBlock;
    }
    
    function addAOI(currentClick){
        if(isPointAvailable(toDataX(currentClick.x), toDataY(currentClick.y))){
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
                
                var rgba = getRandomColor().slice(0, -1);
                rgba = rgba.replace("rgb","rgba");
                rgba += ", 0.7)";
                                                
                data.AOIs.push({
                    index: generateAOIIndex(),
                    startX: toDataX(startX),
                    lengthX: toDataX(lengthX),
                    startY: toDataY(startY),
                    lengthY: toDataY(lengthY),
                    rgba: rgba
                });
                
                listener("UPDATEAOIS");
                
                data.firstClick = null;                
            }
        }
    }
    
    function removeAOI(index){
        data.AOIs.splice(getAOIIndex(index),1);
        listener("UPDATEAOIS");
    }
    
    this.removeAOIs = function(){
        data.AOIs = [];
        listener("UPDATEAOIS");
    }
    
    this.getAOIHTML = function(){
        var HTML = "";
        for(var i = 0; data.AOIs.length > i; i++){
            var aoi = data.AOIs[i];
            HTML +=
                    '<div class="aois inner card-panel hoverable" '+
                    'style="left: ' + toRealX(aoi.startX) + '; '+
                    'top: ' + toRealY(aoi.startY) + '; '+
                    'width: ' + toRealX(aoi.lengthX) + '; '+
                    'height: ' + toRealY(aoi.lengthY) + '; '+
                    'z-index: 3; background-color:' + aoi.rgba + '; " ' +
                    'data-index="' + aoi.index + '">'+
                    '<h5 class="unselectable center-align">' + aoi.index + '</h5>'+
                    '</div>';
        }  
        
        return HTML;
    }

    function getRandomColor(){
        var colors = [
            "red", "pink", "purple", "deep-purple", "indigo", "blue",
            "light-blue", "cyan", "teal", "green", "light-green", "lime",
            "yellow", "amber", "orange", "deep-orange"
        ];
        var tones = [
            "lighten-5", "lighten-4", "lighten-3", "lighten-2", "lighten-1",
            "darken-1", "darken-2", "darken-3", "darken-4",
            "accent-1", "accent-2", "accent-3", "accent-4"
        ];
        
        var color = colors[Math.floor((Math.random() * 16))];
        var tone = tones[Math.floor((Math.random() * 13))];

        $('#map').append('<div id="tempforcolor" class="hidden '+color+' '+tone+'"></div>');
        var rgb = $('#tempforcolor').css("background-color");
        $('#tempforcolor').remove();
        
        return rgb;
    }
    
    this.createDownloadImage = function(stimuliName){
        var backgroundImg = new Image();
        backgroundImg.src = data.categories[findCategoryIndex(stimuliName)].img;
        
        backgroundImg.onload = function(){
            var mapImg = $('#map').find('canvas')[0];

            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext("2d");
            canvas.height = size.dataH;
            canvas.width = size.dataW;

            ctx.drawImage(backgroundImg, 0, 0, size.width, size.height, 0, 0, size.dataW, size.dataH);
            ctx.drawImage(mapImg, 0, 0, mapImg.width, mapImg.height, 0, 0, size.dataW, size.dataH);
            data.download = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
            listener('IMGDOWNLOAD');
        }
    };
    
    this.getDownloadImage = function(){
        return data.download;
    };
    
    /* Misc. Module Functions ENDS */
    
    /* Other Modules Functions STARTS */
    
    /* STA Module Functions STARTS */
    this.showSTAMap = function(stimuliName, settings, filter){
        listener("LOADERSTART");
        createVisualMap(createSTAMap(getSTAData(stimuliName,settings,filter)));
        listener("LOADEREND");
    };
    
    this.isSTAMAPApplicable = function(){
        if(data.AOIs.length > 1){
            return true;
        }
        return false;
    };

    function createSTAMap(staSequence){
        var areaWeights = new Array();
        var areaNodes = new Array();
        var areaEdges = new vis.DataSet();
        for(var i = 0; data.AOIs.length > i; i++){
            areaWeights[i] = 0;
        }

        for(var i = 0; staSequence.length > i; i++){
            var index = getAOIIndex(parseInt(staSequence[i]));
            areaWeights[index]++;
            if(staSequence.length > i+1){
                var indexNext = getAOIIndex(parseInt(staSequence[i+1]));
                var id = staSequence[i] + "-" + staSequence[i+1];
                var label = areaEdges.get(id);
                if(label == null){
                    label = String(i+1);
                } else{
                    label = label.label + ", " + String(i+1);
                }
                areaEdges.update({id: id, from: index, to: indexNext,
                    label: label, arrows: "to",
                    smooth: {enabled: true, type: "continuous"}
                });
            }
        }

        for(var i = 0; areaWeights.length > i; i++){
            var area = data.AOIs[i];
            if(areaWeights[i] != 0){
                var x = toRealX(area.startX + area.lengthX/2);
                var y = toRealY(area.startY + area.lengthY/2);
                areaNodes.push({id: i, x: x, y: y, value: areaWeights[i], group: i, label: i+1});
            }
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
            url: staAddress,
            data: {jsondata: jsondata},
            crossDomain: true,
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
        if(!data.AOIBlock){
            addAOI(params.pointer.canvas);
        }
    });
    
    $('#map').parent().delegate('.aois','dblclick',function(){
        removeAOI($(this).data("index"));
    });
    
    /* Function Calls ENDS */
};
