var currentYear = (new Date()).getFullYear()
var initialPedigreeNode = {
    name: "",
    sex: "",
    yob: undefined,
    parents: [],
    nPartners: undefined,
    partners: [],
    nChildren: undefined,
    children: [],
}
var app = new Vue({
    el: '#app',
    data: function(){
        return {
            phase: 1,
            phaseValid: {},
            probandID: ObjectID().str,
            currentNodeID: undefined,
            nProbandParnters: 0,
            probandPartners: [],
            pedigreeNodes: {},
            treeOpts: {
                target: "#treeMap",
                callbacks: {
                    textRenderer: function (name, extra, textClass) {
                        if (extra && extra.yob) {
                            var yob = parseInt(extra.yob)
                            if (!isNaN(yob)) {
                                name = name + "<br><span class='age'>(Age " + (currentYear - yob) + ")</span>";
                            }
                        }
                        return "<p align='center' class='" + textClass + "'>" + name + "</p>";
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
        nextNode: function(){
            if(this.phase == 1){
                var probandNode = this.pedigreeNodes[this.probandID]
                probandNode.parents = [ObjectID().str, ObjectID().str]
                this.$set(this.pedigreeNodes, this.probandID, probandNode)
                var probandMotherNode = JSON.parse(JSON.stringify(initialPedigreeNode))
                probandMotherNode.sex = "Female"
                this.$set(this.pedigreeNodes, this.pedigreeNodes[this.probandID].parents[0], probandMotherNode)
                var probandFatherNode = JSON.parse(JSON.stringify(initialPedigreeNode))
                probandFatherNode.sex = "Male"
                this.$set(this.pedigreeNodes, this.pedigreeNodes[this.probandID].parents[1], probandFatherNode)
                this.phase = 2;
            }
            if(this.phase == 2){
                var nextNodeInfo = Object.entries(this.pedigreeNodes).find(([nodeID, nodeData]) => {
                    if(nodeData.nPartners == undefined){
                        return true
                    }
                })
                if(nextNodeInfo != undefined) {
                    this.currentNodeID = nextNodeInfo[0]
                }
                else { 
                    this.phase = 3;
                }
            }
        },
        updatePedigree: function(){
            Object.entries(this.pedigreeNodes).forEach(([nodeID, nodeData]) => {
                if(parseInt(nodeData.nPartners) > 0){
                    Array(parseInt(nodeData.nPartners)).fill().forEach((_, partnerIndex) => {
                        if(!nodeData.partners[partnerIndex]){
                            nodeData.partners[partnerIndex] = ObjectID().str
                            this.$set(this.pedigreeNodes, nodeID, nodeData)
                            var partnerData = JSON.parse(JSON.stringify(initialPedigreeNode))
                            if(nodeData.sex == "Male") partnerData.sex = "Female"
                            if(nodeData.sex == "Female") partnerData.sex = "Male"
                            //Non-related individuals will only get a single partner relating them back to the blood relative
                            partnerData.partners = [nodeID]
                            partnerData.nPartners = 1
                            partnerData.parents = ["non-blood"]
                            this.$set(this.pedigreeNodes, nodeData.partners[partnerIndex], partnerData)
                        }
                    })
                }
                if(parseInt(nodeData.nPartners) < nodeData.partners.length) {
                    nodeData.partners.slice(parseInt(nodeData.nPartners)).forEach((partnerID) => {
                        this.$delete(this.pedigreeNodes, partnerID)
                    })
                    nodeData.partners = nodeData.partners.slice(0, parseInt(nodeData.nPartners))
                    this.$set(this.pedigreeNodes, nodeID, nodeData)
                }
                if(parseInt(nodeData.nChildren) > 0){
                    Array(parseInt(nodeData.nChildren)).fill().forEach((_, childIndex) => {
                        if(!nodeData.children[childIndex]){
                            nodeData.children[childIndex] = ObjectID().str
                            this.$set(this.pedigreeNodes, nodeID, nodeData)
                            var childData = JSON.parse(JSON.stringify(initialPedigreeNode))
                            //Children will get their parent from the current non-blood node
                            //TODO: Add other parent id somehow
                            childData.parents = [nodeID]
                            this.$set(this.pedigreeNodes, nodeData.children[childIndex], childData)
                        }
                    })
                }
                if(parseInt(nodeData.nChildren) < nodeData.children.length) {
                    nodeData.children.slice(parseInt(nodeData.nChildren)).forEach((childID) => {
                        this.$delete(this.pedigreeNodes, childID)
                    })
                    nodeData.children = nodeData.children.slice(0, parseInt(nodeData.nChildren))
                    this.$set(this.pedigreeNodes, nodeID, nodeData)
                }
            })
        },
        renderTree: function() { 
            document.querySelector(this.treeOpts.target).innerHTML = ""
            dTree.init(this.generateTree(), this.treeOpts);
        },
        generateChildren: function(partnerData) {
            var children = []
            partnerData.children.forEach((childID) => {
                var childData = this.pedigreeNodes[childID]
                children.push({
                    name: childData.name,
                    class: "node " + childData.sex.toLowerCase(),
                    extra: {
                        yob: childData.yob
                    },
                    marriages: this.generateMarriages(childData)
                })
            })
            return children
        },
        generateMarriages: function(nodeData) {
            var marriages = []
            nodeData.partners.forEach((partnerID) => {
                var partnerData = this.pedigreeNodes[partnerID]
                marriages.push({
                    spouse: {
                        name: partnerData.name,
                        class: "node " + partnerData.sex.toLowerCase(),
                        extra: {
                            yob: partnerData.yob
                        },
                    },
                    children: this.generateChildren(partnerData)
                })
            })
            return marriages
        },
        generateTree: function () {
            var familyData = []
            Object.values(this.pedigreeNodes).forEach((nodeData) => {
                if(nodeData.parents.length == 0){
                    var topLevelNode = {
                        name: nodeData.name,
                        class: "node " + nodeData.sex.toLowerCase(),
                        extra: {
                            yob: nodeData.yob
                        },
                        marriages: this.generateMarriages(nodeData)
                    }
                    familyData.push(topLevelNode)
                }
            })
            return familyData
        }
    },
    mounted: function(){
        var probandNode = JSON.parse(JSON.stringify(initialPedigreeNode))
        this.$set(this.pedigreeNodes, this.probandID, probandNode)
        this.currentNodeID = this.probandID
    }
})
/*proband.name = prompt("What is your name?")
proband.sex = prompt("What is your sex assigned at birth (male/female)?")
proband.sex = ["male", "female"].indexOf(proband.sex) != -1 ? proband.sex : "other"
proband.yob = prompt("What year were you born?")*/
