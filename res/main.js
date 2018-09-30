var currentYear = (new Date()).getFullYear()
var initialPedigreeNode = {
    name: "J",
    sex: "",
    yob: 1995,
    generation: 0,
    parents: [],
    reproNodes: [],
    nPartners: undefined,
    partners: [],
    completedPartners: false,
    probandAncestor: false,
    nChildren: undefined,
    children: [],
    siblings: []
}
var app = new Vue({
    el: '#app',
    data: function(){
        return {
            phase: 1,
            phaseValid: {},
            probandID: ObjectID().str,
            probandParentID: undefined,
            nProbandSiblings: 0,
            currentNodeID: undefined,
            nProbandParnters: 0,
            probandPartners: [],
            pedigreeNodes: {},
            treeOpts: {
                target: "#treeMap",
                minGen: -1,
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
        nProbandSiblings: function(){
            this.updatePedigree()
            this.renderTree()
        }
    },
    methods: {
        getParent: function(parentIndex){
            return this.pedigreeNodes[this.pedigreeNodes[this.pedigreeNodes[this.currentNodeID].parents[0]].parents[parentIndex]]
        },
        nextNode: function(){
            if(this.phase == 1){
                this.phase = 2;
            }
            if(this.phase == 2){
                var nextNodeInfo = Object.entries(this.pedigreeNodes).find(([nodeID, nodeData]) => {
                    return nodeData.parents.length == 0 && nodeData.generation > this.treeOpts.minGen
                })
                if(nextNodeInfo != undefined) {
                    this.currentNodeID = nextNodeInfo[0]
                    var currentNode = this.pedigreeNodes[this.currentNodeID]

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
                    probandMotherNode.children = [this.currentNodeID]
                    probandMotherNode.partners = [reproductionNode.parents[1]]
                    probandMotherNode.probandAncestor = true
                    this.$set(this.pedigreeNodes, reproductionNode.parents[0], probandMotherNode)

                    var probandFatherNode = JSON.parse(JSON.stringify(initialPedigreeNode))
                    probandFatherNode.sex = "Male"
                    probandFatherNode.reproNodes.push(reproductionNodeID)
                    probandFatherNode.generation = currentNode.generation - 1
                    probandFatherNode.nPartners = 1
                    probandFatherNode.nChildren = 1
                    probandFatherNode.children = [this.currentNodeID]
                    probandFatherNode.partners = [reproductionNode.parents[0]]
                    probandFatherNode.probandAncestor = true
                    this.$set(this.pedigreeNodes, reproductionNode.parents[1], probandFatherNode)

                    currentNode.parents = [reproductionNodeID]
                    this.$set(this.pedigreeNodes, currentNode.parents[0], reproductionNode)
                    this.$set(this.pedigreeNodes, this.currentNodeID, currentNode)
                }
                else {
                    this.phase = 3;
                }
            } else if(this.phase == 3) { 
                this.phase = 4
            }
            if(this.phase == 4){
                var nextNodeInfo = Object.entries(this.pedigreeNodes).find(([nodeID, nodeData]) => {
                    return nodeData.completedPartners == false && nodeData.name != ""
                })
                if(nextNodeInfo != undefined) {
                    this.currentNodeID = nextNodeInfo[0]
                }
                else { 
                    this.phase = 5;
                }
            }
        },
        updatePedigree: function(){
            var updatedPedigree = this.pedigreeNodes
            Object.entries(this.pedigreeNodes).forEach(([nodeID, nodeData]) => {
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
                            this.$set(updatedPedigree, reproductionNodeID, reproductionNode)

        
                            var partnerData = JSON.parse(JSON.stringify(initialPedigreeNode))
                            if(nodeData.sex == "Male") partnerData.sex = "Female"
                            if(nodeData.sex == "Female") partnerData.sex = "Male"
                            partnerData.partners = [nodeID]
                            partnerData.reproNodes.push(reproductionNodeID)
                            partnerData.nPartners = 1
                            partnerData.parents = []
                            this.$set(updatedPedigree, nodeData.partners[partnerIndex], partnerData)
                        }
                    })
                }
                //Delete extra partners
                if(parseInt(nodeData.nPartners) >= (nodeData.probandAncestor ? 1 : 0) && parseInt(nodeData.nPartners) < nodeData.partners.length) {
                    nodeData.partners.slice(parseInt(nodeData.nPartners)).forEach((partnerID) => {
                        this.$delete(updatedPedigree, partnerID)
                    })
                    nodeData.reproNodes.slice(parseInt(nodeData.nPartners)).forEach((reproductionNodeID) => {
                        updatedPedigree[reproductionNodeID].children.forEach((childID) => {
                            this.$delete(updatedPedigree, childID)
                        })
                        this.$delete(updatedPedigree, reproductionNodeID)
                    })
                    nodeData.partners = nodeData.partners.slice(0, parseInt(nodeData.nPartners))
                    nodeData.reproNodes = nodeData.reproNodes.slice(0, parseInt(nodeData.nPartners))
                    this.$set(updatedPedigree, nodeID, nodeData)
                }
                //Update missing children
                if(parseInt(nodeData.nChildren) > 0){
                    Array(parseInt(nodeData.nChildren)).fill().forEach((_, childIndex) => {
                        if(!nodeData.children[childIndex]){
                            nodeData.children[childIndex] = ObjectID().str
                            this.$set(updatedPedigree, nodeID, nodeData)
                            var childData = JSON.parse(JSON.stringify(initialPedigreeNode))
                            childData.generation = nodeData.generation + 1
                            //TODO: verify this selection of reproNode ID is correct
                            var reproNodeID = this.pedigreeNodes[nodeID].reproNodes[0]
                            childData.parents = [reproNodeID]
                            this.$set(updatedPedigree, nodeData.children[childIndex], childData)
                            var reproNode = updatedPedigree[reproNodeID]
                            reproNode.children.push(nodeData.children[childIndex])
                            console.log(reproNode)
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
            })
            //Update missing siblings 
            var probandNode = this.pedigreeNodes[this.probandID]
            if(parseInt(this.nProbandSiblings) > 0){
                Array(parseInt(this.nProbandSiblings)).fill().forEach((_, siblingIndex) => {
                    if(!probandNode.siblings[siblingIndex]){
                        var newSiblingID = ObjectID().str;
                        probandNode.siblings[siblingIndex] = newSiblingID
                        this.$set(updatedPedigree, this.probandID, probandNode)
                        var siblingData = JSON.parse(JSON.stringify(initialPedigreeNode))
                        siblingData.generation = probandNode.generation
                        //TODO: verify below logic is correct
                        siblingData.parents = probandNode.parents
                        this.$set(updatedPedigree, newSiblingID, siblingData)
                    }
                })
            }
            //Delete extra siblings 
            if(parseInt(this.nProbandSiblings) >= 0 && parseInt(this.nProbandSiblings) < probandNode.siblings.length) {
                probandNode.siblings.slice(parseInt(this.nProbandSiblings)).forEach((siblingID) => {
                    this.$delete(updatedPedigree, siblingID)
                })
                probandNode.siblings = probandNode.siblings.slice(0, parseInt(this.nProbandSiblings))
                this.$set(updatedPedigree, this.probandID, probandNode)
            }

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
        //Create initial node for proband
        var probandNode = JSON.parse(JSON.stringify(initialPedigreeNode))
        this.$set(this.pedigreeNodes, this.probandID, probandNode)
        this.currentNodeID = this.probandID
    }
})
