var currentYear = (new Date()).getFullYear()
var initialPedigreeNode = {
    unknownIndividual: false,
    name: "",
    sex: "",
    yob: 1995,
    proband: false,
    generation: 0,
    parents: [],
    completedParents: false,
    reproNodes: [],
    nPartners: undefined,
    partners: [],
    completedPartners: false,
    alreadyPartnered: false,
    nChildren: undefined,
    children: [],
    nSiblings: undefined,
    siblings: [],
    completedSiblings: false,
}
var app = new Vue({
    el: '#app',
    data: function(){
        return {
            showNotificationBar: false,
            notificationText: undefined,
            phase: 1,
            phaseValid: {},
            probandID: "",
            probandParentID: undefined,
            nProbandSiblings: 0,
            currentNodeID: undefined,
            nProbandParnters: 0,
            probandPartners: [],
            pedigreeNodes: {},
            treeOpts: {
                target: "#treeMap",
                minGen: -2,
                callbacks: {
                    renderText: function (d) {
                        var nodeText = d.data.name
                        if (d.data && d.data.yob) {
                            var yob = parseInt(d.data.yob)
                            if (!isNaN(yob)) {
                                nodeText = nodeText + "<br><span class='age'>Age " + (currentYear - yob) + "</span>";
                            }
                        }
                        return "<div style='text-align: center'>" + nodeText + "</div>";
                    }
                }
            }
        }
    },
    watch: {
        pedigreeNodes: {
            handler: function(){
                this.updatePedigree()
                this.renderTree()
            },
            deep: true,
        },
    },
    methods: {
        copyToClipboard: function(clipboardPayload){
            const el = document.createElement('textarea');
            el.value = clipboardPayload;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
        },
        showNotification: function(notificationText){
            this.notificationText = notificationText
            this.showNotificationBar = true
        },
        restartPedigree: function(){
            //Create initial node for proband
            var probandNode = JSON.parse(JSON.stringify(initialPedigreeNode))
            probandNode.proband = true
            this.probandID = ObjectID().str
            this.$set(this.pedigreeNodes, this.probandID, probandNode)
            this.currentNodeID = this.probandID
        },
        copyPedigreeToClipboard: function(){
            this.copyToClipboard(JSON.stringify(this.pedigreeNodes))
            this.showNotification("Copied pedigree data to clipboard!")
        },
        dataPrompt: function(){
            var promptData = prompt('Paste your pedigree data below:', "{}")
            if(promptData){
                var newPedigree = {}
                try {
                    newPedigree = JSON.parse(promptData)
                }
                catch(e) {
                    this.showNotification("Invalid JSON input: " + e)
                    return;
                }
                if(newPedigree){                
                    var probandNode = Object.entries(newPedigree).find(([nodeID, nodeData]) => {
                        return nodeData.proband == true
                    })
                    if(probandNode){
                        this.probandID = probandNode[0]
                        this.pedigreeNodes = newPedigree
                        this.phase = 1;
                    }
                    else {
                        this.showNotification("No proband identified in JSON input!")
                        return
                    }
                }
            }
        },
        getParent: function(parentIndex){
            return this.pedigreeNodes[this.pedigreeNodes[this.pedigreeNodes[this.currentNodeID].parents[0]].parents[parentIndex]]
        },
        createParentNodes: function(childNodeID){
            var currentNode = this.pedigreeNodes[childNodeID]

            var reproductionNodeID = ObjectID().str
            var reproductionNode = JSON.parse(JSON.stringify(initialPedigreeNode))
            reproductionNode.name = ""
            reproductionNode.parents = [ObjectID().str, ObjectID().str]
            
            var probandMotherNode = JSON.parse(JSON.stringify(initialPedigreeNode))
            probandMotherNode.sex = "Female"
            probandMotherNode.reproNodes.push(reproductionNodeID)
            probandMotherNode.generation = currentNode.generation - 1
            probandMotherNode.nPartners = 1
            probandMotherNode.nChildren = 1
            probandMotherNode.children = [childNodeID]
            probandMotherNode.partners = [reproductionNode.parents[1]]
            probandMotherNode.alreadyPartnered = true
            this.$set(this.pedigreeNodes, reproductionNode.parents[0], probandMotherNode)

            var probandFatherNode = JSON.parse(JSON.stringify(initialPedigreeNode))
            probandFatherNode.sex = "Male"
            probandFatherNode.reproNodes.push(reproductionNodeID)
            probandFatherNode.generation = currentNode.generation - 1
            probandFatherNode.nPartners = 1
            probandFatherNode.nChildren = 1
            probandFatherNode.children = [childNodeID]
            probandFatherNode.partners = [reproductionNode.parents[0]]
            probandFatherNode.alreadyPartnered = true
            this.$set(this.pedigreeNodes, reproductionNode.parents[1], probandFatherNode)

            currentNode.parents = [reproductionNodeID]
            this.$set(this.pedigreeNodes, currentNode.parents[0], reproductionNode)
            this.$set(this.pedigreeNodes, childNodeID, currentNode)
        },
        setupNextParentQuestionnaire: function(){
            var nextNodeInfo = Object.entries(this.pedigreeNodes).find(([nodeID, nodeData]) => {
                return nodeData.parents.length == 0 && nodeData.generation > this.treeOpts.minGen
            })
            if(nextNodeInfo == undefined) {
                return false
            }
            this.currentNodeID = nextNodeInfo[0]
            this.createParentNodes(this.currentNodeID)
            return this.currentNodeID
        },
        setupNextSiblingQuestionnaire: function(){
            var nextNodeInfo = Object.entries(this.pedigreeNodes).find(([nodeID, nodeData]) => {
                return nodeData.completedSiblings == false && nodeData.generation > this.treeOpts.minGen && nodeData.name != "" && !nodeData.unknownIndividual
            })
            if(nextNodeInfo == undefined){
                return false
            }
            this.currentNodeID = nextNodeInfo[0]
            return this.currentNodeID
        },
        setupNextChildrenQuestionnaire: function(){
            var nextNodeInfo = Object.entries(this.pedigreeNodes).find(([nodeID, nodeData]) => {
                return nodeData.completedPartners == false && nodeData.name != "" && !nodeData.unknownIndividual
            })
            if(nextNodeInfo == undefined) {
                return false
            }
            this.currentNodeID = nextNodeInfo[0]
            return this.currentNodeID
        },
        nextNode: function(){
            if(this.setupNextParentQuestionnaire()){
                console.log("Generated parents questionnaire for:", this.currentNodeID, this.pedigreeNodes[this.currentNodeID])
                this.phase = 2
                return
            }
            if(this.setupNextSiblingQuestionnaire()){
                console.log("Generated siblings questionnaire for:", this.currentNodeID, this.pedigreeNodes[this.currentNodeID])
                this.phase = 3;
                return
            }
            if(this.setupNextChildrenQuestionnaire()){
                console.log("Generated children questionnaire for:", this.currentNodeID, this.pedigreeNodes[this.currentNodeID])
                this.phase = 4;
                return
            }
            this.phase = 5
        },
        regeneratePartners: function(updatedPedigree, nodeID, nodeData){
            //Update missing partners
            if(parseInt(nodeData.nPartners) > 0){
                Array(parseInt(nodeData.nPartners)).fill().forEach((_, partnerIndex) => {
                    if(!nodeData.partners[partnerIndex]){
                        var reproductionNodeID = ObjectID().str
                        nodeData.partners[partnerIndex] = ObjectID().str
                        nodeData.reproNodes.push(reproductionNodeID)
                        this.$set(updatedPedigree, nodeID, nodeData)
                        
                        
                        var reproductionNode = JSON.parse(JSON.stringify(initialPedigreeNode))
                        reproductionNode.name = ""
                        reproductionNode.parents = [nodeID, nodeData.partners[partnerIndex]]
                        reproductionNode.completedPartners = true
                        reproductionNode.completedSiblings = true
                        this.$set(updatedPedigree, reproductionNodeID, reproductionNode)

    
                        var partnerData = JSON.parse(JSON.stringify(initialPedigreeNode))
                        if(nodeData.sex == "Male") partnerData.sex = "Female"
                        if(nodeData.sex == "Female") partnerData.sex = "Male"
                        partnerData.partners = [nodeID]
                        partnerData.alreadyPartnered = true
                        partnerData.reproNodes.push(reproductionNodeID)
                        partnerData.nPartners = 1
                        partnerData.generation = nodeData.generation
                        partnerData.parents = []
                        this.$set(updatedPedigree, nodeData.partners[partnerIndex], partnerData)
                    }
                })
            }
            //Delete extra partners
            if(parseInt(nodeData.nPartners) >= (nodeData.alreadyPartnered ? 1 : 0) && parseInt(nodeData.nPartners) < nodeData.partners.length) {
                nodeData.partners.slice(parseInt(nodeData.nPartners)).forEach((partnerID) => {
                    this.$delete(updatedPedigree, partnerID)
                })
                nodeData.reproNodes.slice(parseInt(nodeData.nPartners)).forEach((reproductionNodeID) => {
                    //Delete children of partners
                    updatedPedigree[reproductionNodeID].children.forEach((childID) => {
                        this.$delete(updatedPedigree, childID)
                    })
                    this.$delete(updatedPedigree, reproductionNodeID)
                })
                nodeData.partners = nodeData.partners.slice(0, parseInt(nodeData.nPartners))
                nodeData.reproNodes = nodeData.reproNodes.slice(0, parseInt(nodeData.nPartners))
                this.$set(updatedPedigree, nodeID, nodeData)
            }
            return updatedPedigree
        },
        regenerateChildren: function(updatedPedigree, nodeID, nodeData){
            //Update missing children
            if(parseInt(nodeData.nChildren) > 0){
                Array(parseInt(nodeData.nChildren)).fill().forEach((_, childIndex) => {
                    if(!nodeData.children[childIndex]){
                        nodeData.children[childIndex] = ObjectID().str
                        this.$set(updatedPedigree, nodeID, nodeData)
                        var childData = JSON.parse(JSON.stringify(initialPedigreeNode))
                        childData.generation = nodeData.generation + 1
                        childData.completedSiblings = true
                        //TODO: verify this selection of reproNode ID is correct
                        var reproNodeID = this.pedigreeNodes[nodeID].reproNodes[0]
                        childData.parents = [reproNodeID]
                        this.$set(updatedPedigree, nodeData.children[childIndex], childData)
                        var reproNode = updatedPedigree[reproNodeID]
                        reproNode.children.push(nodeData.children[childIndex])
                        this.$set(updatedPedigree, reproNodeID, reproNode)
                    }
                })
            }
            //Delete extra children
            if(parseInt(nodeData.nChildren) >= 0 && parseInt(nodeData.nChildren) < nodeData.children.length) {
                nodeData.children.slice(parseInt(nodeData.nChildren)).forEach((childID) => {
                    this.$delete(updatedPedigree, childID)
                })
                nodeData.children = nodeData.children.slice(0, parseInt(nodeData.nChildren))
                this.$set(updatedPedigree, nodeID, nodeData)
            }
            return updatedPedigree
        },
        regenerateSiblings: function(updatedPedigree, nodeID, nodeData){
            //Update missing siblings 
            if(parseInt(nodeData.nSiblings) > 0){
                Array(parseInt(nodeData.nSiblings)).fill().forEach((_, siblingIndex) => {
                    if(!nodeData.siblings[siblingIndex]){
                        var newSiblingID = ObjectID().str;
                        nodeData.siblings[siblingIndex] = newSiblingID
                        this.$set(updatedPedigree, nodeID, nodeData)
                        var siblingData = JSON.parse(JSON.stringify(initialPedigreeNode))
                        siblingData.generation = nodeData.generation
                        siblingData.completedSiblings = true
                        //TODO: verify below logic is correct
                        siblingData.parents = nodeData.parents
                        this.$set(updatedPedigree, newSiblingID, siblingData)
                    }
                })
            }
            //Delete extra siblings 
            if(parseInt(nodeData.nSiblings) >= 0 && parseInt(nodeData.nSiblings) < nodeData.siblings.length) {
                nodeData.siblings.slice(parseInt(nodeData.nSiblings)).forEach((siblingID) => {
                    this.$delete(updatedPedigree, siblingID)
                })
                nodeData.siblings = nodeData.siblings.slice(0, parseInt(nodeData.nSiblings))
                this.$set(updatedPedigree, nodeID, nodeData)
            }
            return updatedPedigree
        },
        updatePedigree: function(){
            var updatedPedigree = this.pedigreeNodes
            Object.entries(this.pedigreeNodes).sort((a, b) => a.generation < b.generation ).forEach(([nodeID, nodeData]) => {
                updatedPedigree = this.regeneratePartners(updatedPedigree, nodeID, nodeData)
                updatedPedigree = this.regenerateChildren(updatedPedigree, nodeID, nodeData)
                updatedPedigree = this.regenerateSiblings(updatedPedigree, nodeID, nodeData)
            })

            //Update pedigree data 
            this.pedigreeNodes = updatedPedigree
        },
        renderTree: function() { 
            //Remove prior graph
            document.querySelector(this.treeOpts.target).innerHTML = ""
            //Regenerate graph
            renderDAG(this.generateTree(), this.treeOpts)
        },
        generateTree: function () {
            //Iterate over pedigreeNodes and pull out relevant data for graph
            var familyData = Object.entries(this.pedigreeNodes).map(([nodeID, nodeData]) => {
                if(nodeData.unknownIndividual) nodeData.name = "Unknown"
                return {
                    id: nodeID,
                    active: nodeID == this.currentNodeID,
                    name: nodeData.name,
                    sex: nodeData.sex,
                    yob: nodeData.yob,
                    parentIds: nodeData.parents,
                }
            })
            return familyData
        }
    },
    mounted: function(){
        this.restartPedigree()
    }
})
