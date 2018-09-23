var currentYear = (new Date()).getFullYear()
var initialPedigreeNode = {
    name: "J",
    sex: "",
    yob: currentYear,
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
                    this.phase++;
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
                            this.$set(this.pedigreeNodes, nodeData.partners[partnerIndex], partnerData)
                        }
                    })
                    if(parseInt(nodeData.nPartners) < nodeData.partners.length) {
                        nodeData.partners.slice(parseInt(nodeData.nPartners)).forEach((partnerID) => {
                            this.$delete(this.pedigreeNodes, partnerID)
                        })
                        nodeData.partners = nodeData.partners.slice(0, parseInt(nodeData.nPartners))
                        this.$set(this.pedigreeNodes, nodeID, nodeData)
                    }
                }
                if(parseInt(nodeData.nChildren) > 0){
                    Array(parseInt(nodeData.nChildren)).fill().forEach((_, childIndex) => {
                        if(!nodeData.children[childIndex]){
                            nodeData.children[childIndex] = ObjectID().str
                            this.$set(this.pedigreeNodes, nodeID, nodeData)
                            var childData = JSON.parse(JSON.stringify(initialPedigreeNode))
                            //Children will get their parents from the current non-blood node, and that node's only partner node.
                            //Note: this only works barring incest, and remarriage within the family.
                            childData.parents = [nodeID, nodeData.partners[0]]
                            this.$set(this.pedigreeNodes, nodeData.children[childIndex], childData)
                        }
                    })
                    if(parseInt(nodeData.nChildren) < nodeData.children.length) {
                        nodeData.children.slice(parseInt(nodeData.nChildren)).forEach((childID) => {
                            this.$delete(this.pedigreeNodes, childID)
                        })
                        nodeData.children = nodeData.children.slice(0, parseInt(nodeData.nChildren))
                        this.$set(this.pedigreeNodes, nodeID, nodeData)
                    }
                }
            })
        },
        renderTree: function() { 
            document.querySelector(this.treeOpts.target).innerHTML = ""
            dTree.init(this.generateTree(), this.treeOpts);
        },
        generateTree: function () {
            var probandNode = {
                name: this.pedigreeNodes[this.probandID].name,
                class: "node " + this.pedigreeNodes[this.probandID].sex.toLowerCase(),
                extra: {
                    yob: this.pedigreeNodes[this.probandID].yob
                },
                marriages: []
            }
            this.pedigreeNodes[this.probandID].partners.forEach((partnerID) => {
                partnerData = this.pedigreeNodes[partnerID]
                var children = partnerData.children.map((childID) => {
                    var childData = this.pedigreeNodes[childID]
                    var childNode = {
                        name: childData.name,
                        class: "node " + this.pedigreeNodes[childID].sex.toLowerCase(),
                        extra: {
                            yob: this.pedigreeNodes[childID].yob
                        },        
                        marriages: []
                    }
                    var grandChildren = childData.children.map((grandchildID) => {
                        var grandchildData = this.pedigreeNodes[grandchildID]
                        return {
                            name: grandchildData.name,
                            class: "node " + this.pedigreeNodes[grandchildID].sex.toLowerCase(),
                            extra: {
                                yob: this.pedigreeNodes[grandchildID].yob
                            },        
                            marriages: []
                        }
                    })
                    childNode.marriages.push({
                        spouse: {
                            name: partnerData.name,
                            class: "node " + this.pedigreeNodes[partnerID].sex.toLowerCase(),
                            extra: {
                                yob: this.pedigreeNodes[partnerID].yob
                            },       
                        },
                        children: childgrandChildrenren
                    })
                    return childNode
                })
                probandNode.marriages.push({
                    spouse: {
                        name: partnerData.name,
                        class: "node " + this.pedigreeNodes[partnerID].sex.toLowerCase(),
                        extra: {
                            yob: this.pedigreeNodes[partnerID].yob
                        },       
                    },
                    children: children
                })
            })
            var familyData = [probandNode]
            return familyData
        }
    },
    mounted: function(){
        this.$set(this.pedigreeNodes, this.probandID, JSON.parse(JSON.stringify(initialPedigreeNode)))
        this.currentNodeID = this.probandID
    }
})
/*proband.name = prompt("What is your name?")
proband.sex = prompt("What is your sex assigned at birth (male/female)?")
proband.sex = ["male", "female"].indexOf(proband.sex) != -1 ? proband.sex : "other"
proband.yob = prompt("What year were you born?")*/
