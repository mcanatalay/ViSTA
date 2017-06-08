#!/usr/bin/python
import socket
import matplotlib.pyplot as plt
import math
import sys
import json
from random import randint 
from pylab import *

# STA Algorithm - PARAMETERS
# EyeTrackingURL = "http://ncc.metu.edu.tr/" #Provide the link for the related page
# degreeOfAccuracy = 0.5	#Provide the degree of accuracy of an eye tracker, such as 0.5.
# distanceBetweenEyeTrackerAndParticipants = 60	#Provide the distance between the eye tracker and the participants in centimeters, such as 60.
# resolutionOfScreenX = 1280 #Provide the X resolution of the screen, such as 1280.
# resolutionOfScreenY = 1024	#Provide the Y resolution of the screen, such as 1024.
# sizeOfScreen = 17	#Provide the size of the screen in inches, such as 17.

def getParticipants (pList, EyeTrackingData):
    Participants = {}
    for x in pList:
        myFile = EyeTrackingData[x]
        myRecords = myFile.split('\n')
        myRecords_templist = []

        for y in range (1, len(myRecords) - 1):
            myRecords_templist.append(myRecords[y].split('\t'))
        if x > 9:
            Participants["P" + str(x)] = myRecords_templist
        else:
            Participants["P0" + str(x)] = myRecords_templist
    return Participants

def getAoIs (SegmentationData):
    AoIs = []
    myFile = SegmentationData
    mySegments = myFile.split('\n')
    
    for x in range (0, len (mySegments)):
        temp = mySegments[x].split('\t')
        AoIs.append ([temp[0], temp[1], temp[2], temp[3], temp[4], temp[5]])
    return AoIs
	
def calculateErrorRateArea (accuracyDegree, Distance, screenResolutionX, screenResolutionY, screenDiagonalSize):
    ErrorRateAreaInCM = tan(radians(accuracyDegree)) * Distance
    ErrorRateAreaInPixels = (ErrorRateAreaInCM * getPPI(screenResolutionX, screenResolutionY, screenDiagonalSize))/2.54
    return round(ErrorRateAreaInPixels,2)
	
def getPPI (screenResolutionX, screenResolutionY, screenDiagonalSize):
    diagonalResolution = sqrt (pow(screenResolutionX, 2) + pow(screenResolutionY, 2))
    PPI = diagonalResolution / screenDiagonalSize
    return PPI
	
def createSequences (Participants, myAoIs, errorRateArea):
    Sequences = {}
    keys = Participants.keys()
    for y in range (0 , len (keys)):
        sequence = ""
        for z in range (0, len (Participants[keys[y]])):
            tempAoI = ""
            tempDuration = 0
            for k in range (0, len (myAoIs)):
                if float(Participants[keys[y]][z][3]) >= (float (myAoIs[k][1]) - errorRateArea) and float(Participants[keys[y]][z][3]) < ( ( (float (myAoIs[k][1]) - errorRateArea) + (float (myAoIs[k][2]) + 2 * errorRateArea) ) ) and float(Participants[keys[y]][z][4]) >= (float (myAoIs[k][3]) - errorRateArea) and float(Participants[keys[y]][z][4]) < ( ( ( float (myAoIs[k][3]) - errorRateArea) + (float (myAoIs[k][4]) + 2 * errorRateArea) ) ):
                    tempAoI = tempAoI + myAoIs[k][5]
                    tempDuration = int (Participants[keys[y]][z][2])

            distanceList = []        
            if len (tempAoI) > 1:
                #tempaoi = "(" + tempAoI + ")"
                for m in range (0 , len(tempAoI)):
                    for n in range (0, len (myAoIs)):
                        if tempAoI[m] == myAoIs[n][5]:
                            distance = []
                            for s in range (int (myAoIs[n][1]), int (myAoIs[n][1]) + int (myAoIs[n][2])):
                                for f in range (int (myAoIs[n][3]), int (myAoIs[n][3]) + int (myAoIs[n][4])):
                                    distance.append(sqrt(pow(float(Participants[keys[y]][z][3]) - s, 2) + pow(float(Participants[keys[y]][z][4]) - f, 2)))
                            distanceList.append([myAoIs[n][5], min(distance)])
                distanceList.sort( key=lambda x: x[1])
                tempAoI = distanceList[0][0]
                            
            if len (tempAoI) != 0:
                sequence = sequence + tempAoI + "-" + str (tempDuration) + "."

        print "A sequence has been created for " +  keys[y]
        Sequences [keys[y]] =  sequence

    return Sequences

def getNumberedSequence (Sequence, AoINames):
    numberedSequence = []
    numberedSequence.append([Sequence[0][0], 1, Sequence[0][1]])
    
    for y in range (1, len(Sequence)):
        if Sequence[y][0] == Sequence[y-1][0]:
            numberedSequence.append([Sequence[y][0], numberedSequence[len(numberedSequence)-1][1], Sequence[y][1]] )
        else:
            numberedSequence.append([Sequence[y][0], getSequenceNumber(Sequence[0:y], Sequence[y][0]), Sequence[y][1]])
            
    AoIList = getExistingAoIListForSequence(numberedSequence)
    AoINames = [w[5] for w in AoINames]
    newSequence = []

    myList = []
    myDictionary = {}
    replacementList = []

    for x in range (0, len (AoIList)):
        totalDuration = 0
        for y in range (0, len(numberedSequence)):
            if numberedSequence[y][0:2] == AoIList[x]:
                totalDuration = totalDuration + int (numberedSequence[y][2])
        myList.append([AoIList[x], totalDuration])

    for x in range (0, len (AoINames)):
        myAoIList = [w for w in myList if w[0][0] == AoINames[x]]
        myAoIList.sort( key=lambda x: x[1])
        myAoIList.reverse()
        if len (myAoIList) > 0:
            myDictionary [AoINames[x]] = myAoIList
        
    for AoI in AoIList:
        index = [w[0] for w in myDictionary[AoI[0]]].index(AoI)
        replacementList.append ([AoI, [AoI[0], (index + 1)]])

    for x in range (0, len(numberedSequence)):
        myReplacementList = [w[0] for w in replacementList]
        index = myReplacementList.index(numberedSequence[x][0:2])
        newSequence.append([replacementList[index][1][0]] + [replacementList[index][1][1]] + [numberedSequence[x][2]])
        
    return newSequence

def getSequenceNumber (Sequence, Item):
    abstractedSequence = getAbstractedSequence (Sequence)
    return abstractedSequence.count(Item) + 1

def getAbstractedSequence (Sequence):
    myAbstractedSequence = [Sequence[0][0]]
    for y in range (1, len (Sequence)):
        if myAbstractedSequence[len(myAbstractedSequence) - 1] != Sequence[y][0]:
            myAbstractedSequence.append(Sequence[y][0])
    return myAbstractedSequence
	
def getExistingAoIListForSequence (Sequence):
    AoIlist = []
    for x in range (0, len(Sequence)):
        try:
            AoIlist.index(Sequence[x][0:2])
        except:
            AoIlist.append(Sequence[x][0:2])
    return AoIlist

def calculateImportanceThreshold (mySequences):
    myAoICounter = getNumberDurationOfAoIs(mySequences)
    commonAoIs = []
    for myAoIdetail in myAoICounter:
        if myAoIdetail[3] == True:
            commonAoIs.append(myAoIdetail)

    if len (commonAoIs) == 0:
        print "No shared instances!"
    
    minValueCounter = commonAoIs[0][1]
    for AoIdetails in commonAoIs:
        if minValueCounter > AoIdetails[1]:
            minValueCounter = AoIdetails[1]

    minValueDuration = commonAoIs[0][2]
    for AoIdetails in commonAoIs:
        if minValueDuration > AoIdetails[2]:
            minValueDuration = AoIdetails[2]
            
    return [minValueCounter, minValueDuration]

def getNumberDurationOfAoIs (Sequences):
    AoIs = getExistingAoIList(Sequences)
    AoIcount=[]
    for x in range (0, len(AoIs)):
        counter = 0
        duration = 0
        flagCounter = 0
        keys = Sequences.keys()
        for y in range (0, len(keys)):
            if [s[0:2] for s in Sequences[keys[y]]].count(AoIs[x]) > 0:
                counter = counter + [s[0:2] for s in Sequences[keys[y]]].count(AoIs[x])
                duration = duration + sum ([int(w[2]) for w in Sequences[keys[y]] if w[0:2] == AoIs[x]])
                flagCounter = flagCounter + 1

        if flagCounter == len (keys):
            AoIcount.append([AoIs[x], counter, duration, True])
        else:
            AoIcount.append([AoIs[x], counter, duration, False])
    return AoIcount

def updateAoIsFlag(AoIs, threshold):
    for AoI in AoIs:
        if AoI [1] >= threshold[0] and AoI [2] >= threshold[1]:
            AoI [3] = True        
    return AoIs

def removeInsignificantAoIs(Sequences, AoIList):
    significantAoIs = []
    for AoI in AoIList:
        if AoI [3] == True:
            significantAoIs.append(AoI[0])

    keys = Sequences.keys()
    for y in range (0 , len (keys)):
        temp = []
        for k in range (0, len(Sequences[keys[y]])):
            try:
                significantAoIs.index(Sequences[keys[y]][k][0:2])
                temp.append(Sequences[keys[y]][k])
            except:
                continue
        Sequences[keys[y]] = temp
    return Sequences

def getExistingAoIList (Sequences):
    AoIlist = []
    keys = Sequences.keys()
    for y in range (0, len(keys)):
        for x in range (0, len(Sequences[keys[y]])):
            try:
                AoIlist.index(Sequences[keys[y]][x][0:2])
            except:
                AoIlist.append(Sequences[keys[y]][x][0:2])
    return AoIlist
	
def calculateNumberDurationOfFixationsAndNSV(Sequences):
    keys = Sequences.keys()
    for x in range (0 , len (keys)):
        myAbstractedSequence = []
        myAbstractedSequence = [Sequences[keys[x]][0][0:2] + [1] + [int(Sequences[keys[x]][0][2])]]
        for y in range (1, len (Sequences[keys[x]])):
            if myAbstractedSequence[len(myAbstractedSequence) - 1][0:2] != Sequences[keys[x]][y][0:2]:
                myAbstractedSequence.append(Sequences[keys[x]][y][0:2] + [1] + [int(Sequences[keys[x]][y][2])])
            else:
                myAbstractedSequence[len(myAbstractedSequence) - 1][2] = myAbstractedSequence[len(myAbstractedSequence) - 1][2] + 1
                myAbstractedSequence[len(myAbstractedSequence) - 1][3] = myAbstractedSequence[len(myAbstractedSequence) - 1][3] + int (Sequences[keys[x]][y][2])

        Sequences[keys[x]] = myAbstractedSequence
    
    keys = Sequences.keys()
    for x in range (0 , len (keys)):
         for y in range (0, len (Sequences[keys[x]])):
             if len (Sequences[keys[x]]) < 2:
                 value = 0
             else:
                 value = 0.9 / (len (Sequences[keys[x]]) - 1)
             NSV = 1 - round(y,2) * value
             Sequences[keys[x]][y] = Sequences[keys[x]][y] + [NSV]
    return Sequences

def calculateTotalNumberDurationofFixationsandNSV(AoIList, Sequences):
    for x in range (0, len(AoIList)):
        duration = 0
        counter = 0
        totalNSV = 0

        flag = 0
        keys = Sequences.keys()
        for y in range (0 , len (keys)):
             for k in range (0, len (Sequences[keys[y]])):
                 if Sequences[keys[y]][k][0:2] == AoIList[x]:
                     counter = counter + Sequences[keys[y]][k][2]
                     duration = duration + Sequences[keys[y]][k][3]
                     totalNSV = totalNSV + Sequences[keys[y]][k][4]
                     flag = flag + 1
        if flag == len (Sequences):
            AoIList[x] = AoIList[x] + [counter] + [duration]  + [totalNSV] + [True]
        else:
            AoIList[x] = AoIList[x] + [counter] + [duration] + [totalNSV] + [False]

    return AoIList

def getValueableAoIs (AoIList):
    commonAoIs = []
    valuableAoIs = []
    for myAoIdetail in AoIList:
        if myAoIdetail[5] == True:
            commonAoIs.append(myAoIdetail)
            
    minValue = commonAoIs[0][4]
    for AoIdetails in commonAoIs:
        if minValue > AoIdetails[4]:
            minValue = AoIdetails[4]
            
    for myAoIdetail in AoIList:
        if myAoIdetail [4] >= minValue:
            valuableAoIs.append(myAoIdetail)

    return valuableAoIs
	
# STA Algorithm

def convertData(response):
    jsonData = json.loads(response)

    rawDataList = jsonData['rawData']
    EyeTrackingData = {}
    pList = []
    for dataIndex in rawDataList.keys():
        ParticipantTrackingData = "Index\tTime\tDuration\tXPoint\tYPoint\tPageName"
        rawData = rawDataList[dataIndex]
        for point in rawData:
            ParticipantTrackingData += "\n"
            ParticipantTrackingData += point["index"] + "\t"
            ParticipantTrackingData += point["timestamp"] + "\t"
            ParticipantTrackingData += point["fixDuration"] + "\t"
            ParticipantTrackingData += point["posX"] + "\t"
            ParticipantTrackingData += point["posY"] + "\t"
            ParticipantTrackingData += point["stimuliName"]
        EyeTrackingData[dataIndex] = ParticipantTrackingData
        pList.append(dataIndex)
        
    isFirstLine = True    
    areaDataArray = jsonData['areaData']
    SegmentationData = ""
    for area in areaDataArray:
        if isFirstLine == False:
            SegmentationData += "\n"
        SegmentationData += str(area["index"]) + "\t"
        SegmentationData += str(int(area["startX"])) + "\t"
        SegmentationData += str(int(area["lengthX"])) + "\t"
        SegmentationData += str(int(area["startY"])) + "\t"
        SegmentationData += str(int(area["lengthY"])) + "\t"
        SegmentationData += str(area["index"])
        isFirstLine = False
    
    settingsData = jsonData['settings']
    settings = {}
    settings['degreeOfAccuracy'] = float(settingsData['daccuracy']);
    settings['distanceBetweenEyeTrackerAndParticipants'] = int(settingsData['distance'])
    settings['resolutionOfScreenX'] = int(settingsData['resX'])
    settings['resolutionOfScreenY'] = int(settingsData['resY'])
    settings['sizeOfScreen'] = int(settingsData['sizeOfScreen'])
    
    return pList, EyeTrackingData, SegmentationData, settings

# Preliminary Stage
def STA(response):
    pList, EyeTrackingData, SegmentationData, settings = convertData(response)
    myParticipants= getParticipants (pList, EyeTrackingData)
    myAoIs = getAoIs(SegmentationData)

    myErrorRateArea = calculateErrorRateArea(settings['degreeOfAccuracy'],
        settings['distanceBetweenEyeTrackerAndParticipants'],
        settings['resolutionOfScreenX'], settings['resolutionOfScreenY'], settings['sizeOfScreen'])
    mySequences = createSequences (myParticipants, myAoIs, myErrorRateArea)

    keys = mySequences.keys()
    for y in range (0 , len (keys)):
        mySequences[keys[y]] = mySequences[keys[y]].split('.')
        del mySequences[keys[y]][len(mySequences[keys[y]])-1]
    for y in range (0 , len (keys)):
        for z in range (0, len(mySequences[keys[y]])):
            mySequences[keys[y]][z] = mySequences[keys[y]][z].split('-')
                    
    # First-Pass
    mySequences_num = {}
    keys = mySequences.keys()
    for y in range (0 , len (keys)):
        if (len(mySequences[keys[y]])!=0):
            mySequences_num[keys[y]] = getNumberedSequence(mySequences[keys[y]],myAoIs)
        else:
            mySequences_num[keys[y]] = []
            
    myImportanceThreshold = calculateImportanceThreshold(mySequences_num)
    myImportantAoIs = updateAoIsFlag(getNumberDurationOfAoIs(mySequences_num), myImportanceThreshold)
    myNewSequences = removeInsignificantAoIs(mySequences_num, myImportantAoIs)

    #Second-Pass
    myNewAoIList = getExistingAoIList(myNewSequences)
    myNewAoIList = calculateTotalNumberDurationofFixationsandNSV(myNewAoIList, calculateNumberDurationOfFixationsAndNSV(myNewSequences))
    myFinalList = getValueableAoIs(myNewAoIList)
    myFinalList.sort( key = lambda x: (x[4], x[3], x[2]))
    myFinalList.reverse()

    commonSequence = []
    for y in range (0, len(myFinalList)):
        commonSequence.append(myFinalList[y][0])
        
    return getAbstractedSequence(commonSequence)

def processData(data):
    return data

# Create a TCP/IP socket
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

# Bind the socket to the port
server_address = ('localhost', 10000)
print >>sys.stderr, 'starting up on %s port %s' % server_address
sock.bind(server_address)

# Listen for incoming connections
sock.listen(1)

recivedData = ""

while True:
    # Wait for a connection
    print >>sys.stderr, 'waiting for a connection'
    connection, client_address = sock.accept()
	
    try:
        print >>sys.stderr, 'connection from', client_address

        # Receive the data in small chunks and retransmit it
        while True:
            data = connection.recv(2048)
            if data:
                if(data != '!ALLSENDED!'):
                    recivedData += data
                else:
                    print >>sys.stderr, 'all data recived'
                    connection.sendall(json.dumps(STA(recivedData)))
                    recivedData = ""
                    break
            else:
                print >>sys.stderr, 'no more data from', client_address
                break
            
    finally:
        # Clean up the connection
        connection.close()
