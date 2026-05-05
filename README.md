# Analytics-Module


### Dev setup

- Clone [Ruuter](https://github.com/buerokratt/Ruuter)
- Navigate to Ruuter and build the image `docker build -t ruuter .`
- Clone [Resql](https://github.com/buerokratt/Resql)
- Navigate to Resql and build the image `docker build -t resql .`
- Clone [Data Mapper](https://github.com/buerokratt/DataMapper)
- Navigate to Data Mapper and build the image `docker build -t data-mapper .`
- Clone [TIM](https://github.com/buerokratt/TIM)
- Navigate to TIM and build the image `docker build -t tim .`
- Clone [Cron Manager](https://github.com/buerokratt/CronManager.git)
- Navigate to Cron Manager dev branch and build the image `docker build -t cron-manager .`
- Running locally need to set ENV variable REACT_APP_LOCAL to true (default).
- Navigate to current repo and run `docker compose up -d`

- Go to <https://localhost:3001>

### Database setup

- For setting up the database initially, run
  `docker run --platform linux/amd64 --network=bykstack riaee/byk-users-db:liquibase20220615 --url=jdbc:postgresql://users_db:5432/byk --username=byk --password=01234 --changelog-file=./master.yml update`
- Run migrations added in this repository by running the helper script `./migrate.sh`
- When creating new migrations, use the helper `./create-migration.sh name-of-migration` which will create a timestamped file in the correct directory and add the required headers

Database configuration seed for developers:
Run the following command in your terminal when the users_db container is running, to add a default user and bot configuration

```
docker exec users_db psql byk byk -c "INSERT INTO public."user" (login,password_hash,first_name,last_name,id_code,display_name,status,created) VALUES
         ('EE90009999999','t','t','t','EE90009999999','t',NULL,NULL);
INSERT INTO public."configuration" ("key",value) VALUES
         ('bot_institution_id','botname');"
```

### Data Mapper Changes

- In Server.js add

```
app.post('/hbs/*', (req, res) => {
    res.render(req.params[0], req.body, function(_, response) {
        if (req.get('type') === 'csv') {
            res.json({response});
        } else if (req.get('type') === 'json') {
            res.json(JSON.parse(response));
        }
        res.render(req.params[0], req.body);
    });
});
```

to enable handlebars templates to receive a body and return a json

- When Building a handlebars template make sure to add `layout:false` so that hbs response in the data-mapper will discard the html layout and only return the body data

### Use external components(Header and Main Navigation)

Currently, Header and Main Navigation used as external components, they are defined as dependency in package.json

```
 "@buerokrat-ria/header": "^0.0.1"
 "@buerokrat-ria/menu": "^0.0.1"
 "@buerokrat-ria/styles": "^0.0.1"
```

### TIM

- if you are running `Locally` then you need to curl the login request or run it on postman first to create and store the cookie in TIM and then on the browser create the cookie manully in the browser with name `customJwtCookie` and the value return from the curl
  the curl request is as follows:

```
curl -X POST -H "Content-Type: application/json" -d '{
  "login": "EE30303039914",
  "password": "OK"
}' http://localhost:8080/analytics/auth/login
```

### Kubernetes deployment

For production deploying on kubernetes use this the variable [`REACT_APP_MENU_JSON`](https://github.com/buerokratt/NoOps/blob/dev/Kubernetes/Modules/Analytics-Module/templates/deployment-byk-analytics-gui.yaml) with the value:

```
"[{\"id\":\"conversations\",\"label\":{\"et\":\"Vestlused\",\"en\":\"Conversations\"},\"path\":\"/chat\",\"children\":[{\"label\":{\"et\":\"Vastamata\",\"en\":\"Unanswered\"},\"path\":\"/unanswered\"},{\"label\":{\"et\":\"Aktiivsed\",\"en\":\"Active\"},\"path\":\"/active\"},{\"label\":{\"et\":\"Ootel\",\"en\":\"Pending\"},\"path\":\"/pending\"},{\"label\":{\"et\":\"Ajalugu\",\"en\":\"History\"},\"path\":\"/history\"}]},{\"id\":\"training\",\"label\":{\"et\":\"Treening\",\"en\":\"Training\"},\"path\":\"/training\",\"children\":[{\"label\":{\"et\":\"Treening\",\"en\":\"Training\"},\"path\":\"/training\",\"children\":[{\"label\":{\"et\":\"Teemad\",\"en\":\"Themes\"},\"path\":\"/training/intents\"},{\"hidden\":true,\"label\":{\"et\":\"Avalikud teemad\",\"en\":\"Public themes\"},\"path\":\"/training/common-intents\"},{\"label\":{\"et\":\"Teemade järeltreenimine\",\"en\":\"Post training themes\"},\"path\":\"/training/intents-followup-training\"},{\"label\":{\"et\":\"Vastused\",\"en\":\"Answers\"},\"path\":\"/training/responses\"},{\"label\":{\"et\":\"Reeglid\",\"en\":\"Rules\"},\"path\":\"/training/rules\"},{\"hidden\":true,\"label\":{\"et\":\"Konfiguratsioon\",\"en\":\"Configuration\"},\"path\":\"/training/configuration\"},{\"label\":{\"et\":\"Vormid\",\"en\":\"Forms\"},\"path\":\"/training/forms\"},{\"label\":{\"et\":\"Mälukohad\",\"en\":\"Slots\"},\"path\":\"/training/slots\"},{\"hidden\":true,\"label\":{\"et\":\"Automatic Teenused\",\"en\":\"Automatic Services\"},\"path\":\"/auto-services\"}]},{\"label\":{\"et\":\"Ajaloolised vestlused\",\"en\":\"Historical conversations\"},\"path\":\"/history\",\"children\":[{\"label\":{\"et\":\"Ajalugu\",\"en\":\"History\"},\"path\":\"/history/history\"},{\"hidden\":true,\"label\":{\"et\":\"Pöördumised\",\"en\":\"Appeals\"},\"path\":\"/history/appeal\"}]},{\"label\":{\"et\":\"Mudelipank ja analüütika\",\"en\":\"Modelbank and analytics\"},\"path\":\"/analytics\",\"children\":[{\"label\":{\"et\":\"Teemade ülevaade\",\"en\":\"Overview of topics\"},\"path\":\"/analytics/overview\"},{\"label\":{\"et\":\"Mudelite võrdlus\",\"en\":\"Comparison of models\"},\"path\":\"/analytics/models\"},{\"hidden\":true,\"label\":{\"et\":\"Testlood\",\"en\":\"testTracks\"},\"path\":\"/analytics/testcases\"}]},{\"label\":{\"et\":\"Treeni uus mudel\",\"en\":\"Train new model\"},\"path\":\"/train-new-model\"}]},{\"id\":\"analytics\",\"label\":{\"et\":\"Analüütika\",\"en\":\"Analytics\"},\"path\":\"/analytics\",\"children\":[{\"label\":{\"et\":\"Ülevaade\",\"en\":\"Overview\"},\"path\":\"/overview\"},{\"label\":{\"et\":\"Vestlused\",\"en\":\"Chats\"},\"path\":\"/chats\"},{\"label\":{\"et\":\"Tagasiside\",\"en\":\"Feedback\"},\"path\":\"/feedback\"},{\"label\":{\"et\":\"Nõustajad\",\"en\":\"Advisors\"},\"path\":\"/advisors\"},{\"label\":{\"et\":\"Avaandmed\",\"en\":\"Reports\"},\"path\":\"/reports\"}]},{\"id\":\"services\",\"hidden\":true,\"label\":{\"et\":\"Teenused\",\"en\":\"Services\"},\"path\":\"/services\",\"children\":[{\"label\":{\"et\":\"Ülevaade\",\"en\":\"Overview\"},\"path\":\"/overview\"},{\"label\":{\"et\":\"Uus teenus\",\"en\":\"New Service\"},\"path\":\"/newService\"},{\"label\":{\"et\":\"Automatic Teenused\",\"en\":\"Automatic Services\"},\"path\":\"/auto-services\"},{\"label\":{\"et\":\"Probleemsed teenused\",\"en\":\"Faulty Services\"},\"path\":\"/faultyServices\"}]},{\"id\":\"settings\",\"label\":{\"et\":\"Haldus\",\"en\":\"Administration\"},\"path\":\"/settings\",\"children\":[{\"label\":{\"et\":\"Kasutajad\",\"en\":\"Users\"},\"path\":\"/users\"},{\"label\":{\"et\":\"Vestlusbot\",\"en\":\"Chatbot\"},\"path\":\"/chatbot\",\"children\":[{\"label\":{\"et\":\"Seaded\",\"en\":\"Settings\"},\"path\":\"/chatbot/settings\"},{\"label\":{\"et\":\"Tervitussõnum\",\"en\":\"Welcome message\"},\"path\":\"/chatbot/welcome-message\"},{\"label\":{\"et\":\"Välimus ja käitumine\",\"en\":\"Appearance and behavior\"},\"path\":\"/chatbot/appearance\"},{\"label\":{\"et\":\"Erakorralised teated\",\"en\":\"Emergency notices\"},\"path\":\"/chatbot/emergency-notices\"}]},{\"label\":{\"et\":\"Asutuse tööaeg\",\"en\":\"Office opening hours\"},\"path\":\"/working-time\"},{\"label\":{\"et\":\"Sessiooni pikkus\",\"en\":\"Session length\"},\"path\":\"/session-length\"}]},{\"id\":\"monitoring\",\"hidden\":true,\"label\":{\"et\":\"Seire\",\"en\":\"Monitoring\"},\"path\":\"/monitoring\",\"children\":[{\"label\":{\"et\":\"Aktiivaeg\",\"en\":\"Working hours\"},\"path\":\"/uptime\"}]}]"
```

like this:

```
            - name: REACT_APP_MENU_JSON
              value: "[{\"id\":\"conversations\",\"label\":{\"et\":\"Vestlused\",\"en\":\"Conversations\"},\"path\":\"/chat\",\"children\":[{\"label\":{\"et\":\"Vastamata\",\"en\":\"Unanswered\"},\"path\":\"/unanswered\"},{\"label\":{\"et\":\"Aktiivsed\",\"en\":\"Active\"},\"path\":\"/active\"},{\"label\":{\"et\":\"Ootel\",\"en\":\"Pending\"},\"path\":\"/pending\"},{\"label\":{\"et\":\"Ajalugu\",\"en\":\"History\"},\"path\":\"/history\"}]},{\"id\":\"training\",\"label\":{\"et\":\"Treening\",\"en\":\"Training\"},\"path\":\"/training\",\"children\":[{\"label\":{\"et\":\"Treening\",\"en\":\"Training\"},\"path\":\"/training\",\"children\":[{\"label\":{\"et\":\"Teemad\",\"en\":\"Themes\"},\"path\":\"/training/intents\"},{\"hidden\":true,\"label\":{\"et\":\"Avalikud teemad\",\"en\":\"Public themes\"},\"path\":\"/training/common-intents\"},{\"label\":{\"et\":\"Teemade järeltreenimine\",\"en\":\"Post training themes\"},\"path\":\"/training/intents-followup-training\"},{\"label\":{\"et\":\"Vastused\",\"en\":\"Answers\"},\"path\":\"/training/responses\"},{\"label\":{\"et\":\"Reeglid\",\"en\":\"Rules\"},\"path\":\"/training/rules\"},{\"hidden\":true,\"label\":{\"et\":\"Konfiguratsioon\",\"en\":\"Configuration\"},\"path\":\"/training/configuration\"},{\"label\":{\"et\":\"Vormid\",\"en\":\"Forms\"},\"path\":\"/training/forms\"},{\"label\":{\"et\":\"Mälukohad\",\"en\":\"Slots\"},\"path\":\"/training/slots\"},{\"hidden\":true,\"label\":{\"et\":\"Automatic Teenused\",\"en\":\"Automatic Services\"},\"path\":\"/auto-services\"}]},{\"label\":{\"et\":\"Ajaloolised vestlused\",\"en\":\"Historical conversations\"},\"path\":\"/history\",\"children\":[{\"label\":{\"et\":\"Ajalugu\",\"en\":\"History\"},\"path\":\"/history/history\"},{\"hidden\":true,\"label\":{\"et\":\"Pöördumised\",\"en\":\"Appeals\"},\"path\":\"/history/appeal\"}]},{\"label\":{\"et\":\"Mudelipank ja analüütika\",\"en\":\"Modelbank and analytics\"},\"path\":\"/analytics\",\"children\":[{\"label\":{\"et\":\"Teemade ülevaade\",\"en\":\"Overview of topics\"},\"path\":\"/analytics/overview\"},{\"label\":{\"et\":\"Mudelite võrdlus\",\"en\":\"Comparison of models\"},\"path\":\"/analytics/models\"},{\"hidden\":true,\"label\":{\"et\":\"Testlood\",\"en\":\"testTracks\"},\"path\":\"/analytics/testcases\"}]},{\"label\":{\"et\":\"Treeni uus mudel\",\"en\":\"Train new model\"},\"path\":\"/train-new-model\"}]},{\"id\":\"analytics\",\"label\":{\"et\":\"Analüütika\",\"en\":\"Analytics\"},\"path\":\"/analytics\",\"children\":[{\"label\":{\"et\":\"Ülevaade\",\"en\":\"Overview\"},\"path\":\"/overview\"},{\"label\":{\"et\":\"Vestlused\",\"en\":\"Chats\"},\"path\":\"/chats\"},{\"label\":{\"et\":\"Tagasiside\",\"en\":\"Feedback\"},\"path\":\"/feedback\"},{\"label\":{\"et\":\"Nõustajad\",\"en\":\"Advisors\"},\"path\":\"/advisors\"},{\"label\":{\"et\":\"Avaandmed\",\"en\":\"Reports\"},\"path\":\"/reports\"}]},{\"id\":\"services\",\"hidden\":true,\"label\":{\"et\":\"Teenused\",\"en\":\"Services\"},\"path\":\"/services\",\"children\":[{\"label\":{\"et\":\"Ülevaade\",\"en\":\"Overview\"},\"path\":\"/overview\"},{\"label\":{\"et\":\"Uus teenus\",\"en\":\"New Service\"},\"path\":\"/newService\"},{\"label\":{\"et\":\"Automatic Teenused\",\"en\":\"Automatic Services\"},\"path\":\"/auto-services\"},{\"label\":{\"et\":\"Probleemsed teenused\",\"en\":\"Faulty Services\"},\"path\":\"/faultyServices\"}]},{\"id\":\"settings\",\"label\":{\"et\":\"Haldus\",\"en\":\"Administration\"},\"path\":\"/settings\",\"children\":[{\"label\":{\"et\":\"Kasutajad\",\"en\":\"Users\"},\"path\":\"/users\"},{\"label\":{\"et\":\"Vestlusbot\",\"en\":\"Chatbot\"},\"path\":\"/chatbot\",\"children\":[{\"label\":{\"et\":\"Seaded\",\"en\":\"Settings\"},\"path\":\"/chatbot/settings\"},{\"label\":{\"et\":\"Tervitussõnum\",\"en\":\"Welcome message\"},\"path\":\"/chatbot/welcome-message\"},{\"label\":{\"et\":\"Välimus ja käitumine\",\"en\":\"Appearance and behavior\"},\"path\":\"/chatbot/appearance\"},{\"label\":{\"et\":\"Erakorralised teated\",\"en\":\"Emergency notices\"},\"path\":\"/chatbot/emergency-notices\"}]},{\"label\":{\"et\":\"Asutuse tööaeg\",\"en\":\"Office opening hours\"},\"path\":\"/working-time\"},{\"label\":{\"et\":\"Sessiooni pikkus\",\"en\":\"Session length\"},\"path\":\"/session-length\"}]},{\"id\":\"monitoring\",\"hidden\":true,\"label\":{\"et\":\"Seire\",\"en\":\"Monitoring\"},\"path\":\"/monitoring\",\"children\":[{\"label\":{\"et\":\"Aktiivaeg\",\"en\":\"Working hours\"},\"path\":\"/uptime\"}]}]"
```
