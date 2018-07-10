import React, { Component } from "react";
import {
  Container,
  Header,
  Title,
  Content,
  Footer,
  FooterTab,
  Button,
  Left,
  Right,
  Body,
  Icon,
  Text,
  Form,
  Item,
  Input,
  List,
  ListItem,
  Thumbnail,
  Label
} from "native-base";
import {
  StyleSheet,
  Modal,
  TouchableHighlight,
  Linking,
  TextInput,
  Keyboard,
  RefreshControl,
  Alert,
  AsyncStorage
} from "react-native";
import axios from "axios";
import DOMParser from "react-native-html-parser";
import moment from "moment";
import { auth, firebase } from "./firebase/firebase";

export default class ReaderX extends Component {
  constructor() {
    super();
    this.state = {
      modalVisible: false,
      posts: [],
      loading: true,
      feedUrl: "",
      feedName: "",
      feedList: [],
      newFeedUrl: "",
      newFeedName: "",
      refreshing: false,
      editMode: false,
      editId: ""
    };

    //Setup our db using firebase
    this.db = firebase.database();

    //Pesky error firebase and timers
    //https://github.com/firebase/firebase-js-sdk/issues/97
    console.ignoredYellowBox = ["Setting a timer", "Remote debugger"];
  }

  _onRefresh() {
    //start the refresh
    this.setState({ refreshing: true });

    //Get the readers
    this.getReaders();
  }

  setModalVisible(visible) {
    //Reset things
    this.setState({
      modalVisible: visible,
      editMode: false,
      editId: "",
      newFeedName: "",
      newFeedUrl: ""
    });
  }

  componentDidMount() {
    //When ready get the readers
    this.getReaders();
  }

  saveReader() {
    var fn = this.state.newFeedName,
      fu = this.state.newFeedUrl,
      self = this;

    if (!fn || !fu) {
      alert("Add a name and url");

      return false;
    }

    //If in edit mode update the id
    if (this.state.editMode) {
      this.db
        .ref("feeds")
        .child(this.state.editId)
        .update(
          {
            feedName: fn,
            feedUrl: fu
          },
          function() {
            //Set form to blank
            self.setState({
              newFeedName: "",
              newFeedUrl: "",
              editMode: false,
              editId: ""
            });

            //Let the user know it saved
            Alert.alert("Saved!");

            //Hide the keyboard
            Keyboard.dismiss();

            //Summon the readers
            self.getReaders();
          }
        );

      return false;
    }

    this.db.ref("feeds").push(
      {
        feedName: fn,
        feedUrl: fu
      },
      function() {
        //Reset the form
        self.setState({
          newFeedName: "",
          newFeedUrl: ""
        });

        //Let the user know it saved
        Alert.alert("Saved!");

        //Hide the keyboard
        Keyboard.dismiss();

        //Summon the readers
        self.getReaders();
      }
    );
  }

  deleteReader(id) {
    var self = this;

    //Check before deleting
    Alert.alert(
      "Delete Feed:",
      "Are you sure you want to delete?",
      [
        {
          text: "Cancel",
          onPress: () => {}
        },
        {
          text: "Delete",
          onPress: () => {
            self.deleteFeed(id);
          }
        }
      ],
      { cancelable: false }
    );
  }

  deleteFeed(id) {
    //Remove from db
    this.db
      .ref("feeds")
      .child(id)
      .remove();

    //Reload
    this.getReaders();
  }

  editReader(id) {
    var self = this,
      ref = this.db.ref("feeds").child(id);

    //Load up the reader info
    ref.on("value", function(snap) {
      var data = snap.val();

      //Set the for to have the data
      self.setState({
        newFeedName: data.feedName,
        newFeedUrl: data.feedUrl,
        editId: id,
        editMode: true
      });
    });
  }

  convertUTCDateToLocalDate(date) {
    var newDate = new Date(
      date.getTime() + date.getTimezoneOffset() * 60 * 1000
    );

    var offset = date.getTimezoneOffset() / 60;
    var hours = date.getHours();

    newDate.setHours(hours - offset);

    return newDate;
  }

  getReaders() {
    var urls = [],
      self = this;

    //Get all readers
    this.db.ref("feeds").on("value", async feed => {
      feed.forEach(f => {
        var obj = f.val();

        obj.feedHash = f.key;
        urls.push(obj);
      });

      //Do a reset
      this.state.feedList = [];

      //Set new list
      this.setState({
        feedList: urls
      });

      this.state.posts = [];
      this.setState({
        posts: []
      });

      urls.forEach(function(url, index) {
        self.fetchPosts(url.feedUrl).then(this.parsePosts);
      });
    });

    //Clear the refreshing state
    this.setState({ refreshing: false });
  }

  fetchPosts = url =>
    fetch(
      "https://api.rss2json.com/v1/api.json?rss_url=" +
        url +
        "&api_key=atojnjecsei7lllnpdzggqav39figqgfvdok48g0&count=50"
    )
      .then(resp => resp.json())
      .then(this.parsePosts);

  parsePosts = response => {
    var postList = [];

    //Make sure the api is returning good data
    if (typeof response !== "undefined" && response.status === "ok") {
      response.items.forEach(item => {
        //var d = convertUTCDateToLocalDate(new Date(item.pubDate));

        postList.push({
          title: item.title,
          href: item.link,
          desc: item.description,
          date: moment(item.pubDate)
            .subtract("193", "minutes")
            .format("MMMM Do YYYY, h:mm a"),
          timestamp: moment(item.pubDate)
            .subtract("193", "minutes")
            .valueOf(),
          thumb: item.thumbnail,
          articleTitle: response.feed.title
        });
      });
    }

    //Check to make sure we got a post
    if (postList.length) {
      var masterList = this.state.posts.concat(postList);

      //Erase the post
      this.state.posts = [];
      this.setState({
        posts: []
      });

      //Set the post and order them
      this.setState({
        posts: masterList.sort((a, b) => {
          return b.timestamp - a.timestamp;
        })
      });
    }
  };

  openArticle = url => {
    //Open article in new page
    Linking.openURL(url);
  };

  textChange = stateName => value => {
    //Handle the changing of text
    this.setState({
      [stateName]: value
    });
  };

  render() {
    return (
      <Container>
        <Header
          androidStatusBarColor="#7f0000"
          style={{ backgroundColor: "#990000" }}
        >
          <Body>
            <Title>ReaderX</Title>
          </Body>
          <Right>
            <Button
              transparent
              light
              iconLeft
              onPress={() => {
                this.setModalVisible(true);
              }}
            >
              <Icon name="md-add-circle" />
            </Button>
          </Right>
        </Header>
        <Content
          padder={true}
          refreshControl={
            <RefreshControl
              refreshing={this.state.refreshing}
              onRefresh={this._onRefresh.bind(this)}
            />
          }
        >
          <Text style={this.state.posts.length ? { display: "none" } : null}>
            Please add a rss url to begin.
          </Text>

          <List
            dataArray={this.state.posts}
            renderRow={item => (
              <ListItem onPress={() => this.openArticle(item.href)}>
                <Thumbnail small size={50} source={{ uri: item.thumb }} />
                <Body style={{ width: "100%" }}>
                  <Text style={{ fontSize: 8 }}>{item.title}</Text>
                  <Text style={{ fontSize: 6, marginTop: 5 }}>{item.date}</Text>
                  <Text style={{ fontSize: 6, fontWeight: "bold" }}>
                    -- {item.articleTitle} --
                  </Text>
                </Body>
              </ListItem>
            )}
          />

          <Modal
            animationType="slide"
            transparent={false}
            visible={this.state.modalVisible}
            onRequestClose={() => this.setModalVisible(false)}
          >
            <Container>
              <Content padder={true}>
                <Form>
                  <Item regular>
                    <Input
                      onChangeText={this.textChange("newFeedName")}
                      value={this.state.newFeedName}
                      name="newFeedName"
                      placeholder="Rss Name"
                    />
                  </Item>
                  <Item regular style={{ marginTop: 15 }}>
                    <Input
                      onChangeText={this.textChange("newFeedUrl")}
                      value={this.state.newFeedUrl}
                      name="newFeedUrl"
                      placeholder="Rss Url"
                    />
                  </Item>
                  <Button
                    block
                    style={{
                      backgroundColor: "#990000",
                      marginTop: 20,
                      marginBottom: 20
                    }}
                    onPress={() => {
                      this.saveReader();
                    }}
                  >
                    <Text>{this.state.editMode ? "Save" : "Add"}</Text>
                  </Button>
                </Form>
                <Text>Feeds:</Text>
                <List
                  dataArray={this.state.feedList}
                  refreshControl={
                    <RefreshControl
                      refreshing={this.state.refreshing}
                      onRefresh={this._onRefresh.bind(this)}
                    />
                  }
                  renderRow={feed => (
                    <ListItem noIndent>
                      <Body>
                        <Text style={{ fontSize: 12 }}>{feed.feedName}</Text>
                        <Text style={{ fontSize: 6 }}>{feed.feedUrl}</Text>
                      </Body>
                      <Right>
                        <Button
                          transparent
                          light
                          iconLeft
                          onPress={() => {
                            this.editReader(feed.feedHash);
                          }}
                        >
                          <Icon
                            style={{ color: "#900" }}
                            name="ios-create-outline"
                          />
                        </Button>
                      </Right>
                      <Right>
                        <Button
                          transparent
                          light
                          iconLeft
                          onPress={() => {
                            this.deleteReader(feed.feedHash);
                          }}
                        >
                          <Icon
                            style={{ color: "#900" }}
                            name="ios-backspace-outline"
                          />
                        </Button>
                      </Right>
                    </ListItem>
                  )}
                />
              </Content>
            </Container>
          </Modal>
        </Content>
      </Container>
    );
  }
}
