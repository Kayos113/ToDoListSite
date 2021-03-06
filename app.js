const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const _ = require('lodash');

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

const uri = "mongodb+srv://admin-will:test123@cluster0.awlf2.mongodb.net/toDoListDB";
mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false
}); // Connect to Mongo Database

const itemsSchema = { // Create an item Schema that will be used to build items to insert into the db
  name: String,
  count: {
    type: Number,
    min: 1,
    max: 3,
    default: 1
  }
};
const Item = mongoose.model("Item", itemsSchema); // Make a model in the db to hold the schema type we created

// Three arbitrary Items to populate the list at first launch
const item1 = new Item({
  name: "Welcome to your todolist!"
});
const item2 = new Item({
  name: "Hit the + to add a new task."
});
const item3 = new Item({
  name: "<--- click this to complete your tasks."
});

const defaultItems = [item1, item2, item3];

const listSchema = {
  name: String,
  items: [itemsSchema]
}
const List = mongoose.model("List", listSchema);

app.get("/", function(req, res) {

  Item.find({}, (err, foundItems) => {
    if (foundItems.length === 0) {

      Item.insertMany(defaultItems, (err) => {
        if (err) {
          console.log(err);
        } else {
          console.log("Inserted documents successfully");
        }
      });
      res.redirect('/');
    } else {
      res.render("list", {
        listTitle: "Today",
        newListItems: foundItems
      });
    }

  });


});

app.post("/", function(req, res) {
  const itemName = req.body.newItem;
  const listName = req.body.list;
  console.log("Adding " + itemName + " to " + listName);
  const item = new Item({
    name: itemName
  });

  if (listName === "Today") {
    item.save();
    res.redirect("/");
  } else {
    List.findOne({
      name: listName
    }, (err, foundList) => {
      foundList.items.push(item);
      foundList.save();
      res.redirect("/" + listName);
    });
  }

});

app.post("/delete", (req, res) => {
  const itemID = req.body.checkbox;
  const listName = req.body.listName;

  Item.findOneAndUpdate({_id:itemID}, {$inc: {count:1}}, (err, foundItem) => {
    let itemStage = foundItem.count;
    console.log(itemStage);
    if(itemStage===3)  {
      // Delete the selected item

        setTimeout(() => {
          if (listName === "Today") { //for the default Today list
            Item.deleteOne({
              _id: itemID
            }, (err) => {
              if (err) {
                console.log(err);
              } else {
                console.log("Successfully deleted item with id: " + itemID);
                res.redirect("/");
              }
            });

          } else { // For a dynamic list
            List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: itemID}}}, (err, foundList) => {
              if(!err) {
                res.redirect("/"+listName);
              }
            });
          }
        }, 500);
    } else { // it is not time to delete it.
      if(listName==="Today") {
        res.redirect("/");
      } else {
        res.redirect("/")+listName;
      }
    }
  })

})

app.get("/:customListName", (req, res) => {
  const customListName = _.capitalize(req.params.customListName);

  List.findOne({
    name: customListName
  }, (err, foundList) => {
    if (!err) {
      if (!foundList) {
        // Create a new List
        const list = new List({
          name: customListName,
          items: defaultItems
        });
        list.save();
        res.redirect("/" + customListName);
      } else {
        // Show an Existing List
        res.render("list", {
          listTitle: foundList.name,
          newListItems: foundList.items
        });
      }
    } //end of err if statement
  });
});


app.get("/about", function(req, res) {
  res.render("about");
});


let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port, function() {
  console.log("Server started on port 3000");
});
