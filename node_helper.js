var NodeHelper = require("node_helper");
var request = require("request");
var log;

module.exports = NodeHelper.create({
	start: function() {
		console.log("Démarrage du node_helper de MMM-AirParif...");
		this.API = "https://api.airparif.asso.fr/indices/prevision/commune?insee="
		this.url = ""
		this.codeInsee = [];
		this.Village = [];
		this.data = [];
		this.SCAN = {
				"ville": [],
				"data" : []
		}
	},

	/*** Script de recuperation de toutes les infos ***/
	getData: function(payload) {
		var self = this
		
		
		for(var i in self.config.ville) {
		this.insee(self.config.ville[i],i) // Recupere les codes INSEE des villes
		

		setTimeout(() => {
			this.url = self.API
			for(var i in self.codeInsee) { // fabrication de l'URL avec les codes INSEE
				
				if(i == 0) this.url += self.codeInsee[i]
				else this.url += ("&insee=" + self.codeInsee[i])
			}
			
			this.getAir(this.url); // envoi vers l'api de AirParif
		} ,4000);
	}
		setTimeout(() => {
			for (var i in self.codeInsee) {
				for (var j in self.data[self.codeInsee[i]]) { 
						self.SCAN.ville[i] = self.Village[i]
						self.SCAN.data[i] = self.data[self.codeInsee[i]];						
				}
			}						
			console.info("[AirParif] SCAN Effectué")

			if (self.SCAN.ville[i] == null) self.sendSocketNotification("RESULT", false); // pas de villes retournées (erreur)
			else self.sendSocketNotification("RESULT", self.SCAN); // envoie les donnnées
		} , 6000);

	},

	/*** Update Script **/
	getUpdate: function() {
		var self = this
		this.getAir(this.url);
		setTimeout(() => {

                	for(var i in self.data) {
                   	   for (var j in self.data[self.codeInsee[i]]) {
								self.SCAN.ville[i] = self.Village[i]
								self.SCAN.data[i] = self.data[i].jour
                   	   }
                	}
					console.log("[AirParif] SCAN Update Effectué");

					if (self.SCAN.ville[0] == null) self.sendSocketNotification("RESULT", false);
                	else self.sendSocketNotification("RESULT", self.SCAN);
		} , 4000);
	},


	/*** requete vers l'API de AirParif ***/
	getAir: function(url) {
		var self = this;
		request({ url: url, method: "GET", headers: {'User-Agent':'request','X-Api-Key': self.config.key } }, function(error, response, body) {
			var result;
			if (!error && response.statusCode == 200) { 
				result = JSON.parse(body);
				if (result.status == "error") {
					console.log("[AirParif][API] Erreur > "+ response.statusCode + " -- " + result)
				} else {
					self.data = result;
				}
			} else {
				if (body) { 
					result = JSON.parse(body);
					if (result.erreur) console.log("[AirParif][API] Erreur: " + result.erreur)
				}
				else console.info("[AirParif][API] Erreur: Aucune Donnée trouvé")
			}
		});
	},

  /*** Requete code INSEE vers geo.api.gouv.fr et formate la ville ***/
  insee: function(ville,i) {
    var self = this;
    var str = ville;
    var split = str.split(',');
    var codepostal = split[0];
    self.Village[i] = split[1];
	
    if(codepostal.substring(0,2) == "75") {
      let dep = codepostal.substring(0,2)
      let arr = codepostal.substring(3,5)
      self.codeInsee[i] = dep+"1"+arr

    } else {
      var url = 'https://geo.api.gouv.fr/communes?codePostal=' + codepostal + '&nom=' + self.Village[i] + '&fields=nom,code,codesPostaux&format=json';
	  request.get({ url: url, json: true, headers: {'User-Agent': 'request'} }, (err, res, data) => {
        if (err) {
			console.log("[AirParif][INSEE] " + err);
        } else {
          if (res.statusCode !== 200) console.log("[AirParif][INSEE] Erreur Status Code:", res);
          else {
            if (!data[0]) {
				console.log("[AirParif][INSEE] Erreur Aucune Données !")
            } else {
              self.codeInsee[i] = data[0].code;
			  self.Village[i] = data[0].nom;
            }
          }
        }
      });
    }
	},

	/*** Reception notification par Socket ***/
	socketNotificationReceived: function(notification, payload) {
		if (notification === "SCAN") {
			this.config = payload;
			this.getData(this.config);
		}
		if (notification === "UPDATE") {
			this.getUpdate();
		}
	}
});
