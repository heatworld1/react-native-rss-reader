import React, { Component } from "react";
import update from "immutability-helper";
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
  Alert
} from "react-native";
import axios from "axios";
import DOMParser from "react-native-html-parser";
import moment from "moment";
import { auth, firebase } from "./firebase/firebase";

export default class ReaderX extends Component {
  constructor() {
    console.log("constructor");
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

    console.ignoredYellowBox = ["Setting a timer"];

    this.db = firebase.database();

    //
  }

  _onRefresh() {
    this.setState({ refreshing: true });
    this.getReaders(true);
  }

  setModalVisible(visible) {
    console.log("close");
    this.setState({
      modalVisible: visible,
      editMode: false,
      editId: "",
      newFeedName: "",
      newFeedUrl: ""
    });
  }

  componentDidMount() {
    console.log("did mount");

    this.getReaders();
  }

  saveReader() {
    var fn = this.state.newFeedName,
      fu = this.state.newFeedUrl,
      self = this;

    console.log("state", this.state);

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
            self.setState({
              newFeedName: "",
              newFeedUrl: "",
              editMode: false,
              editId: ""
            });

            Alert.alert("Saved!");

            Keyboard.dismiss();
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
        self.setState({
          newFeedName: "",
          newFeedUrl: ""
        });

        Alert.alert("Saved!");

        Keyboard.dismiss();
        self.getReaders();
      }
    );
  }

  deleteReader(id) {
    var self = this;
    console.log("eelet", id);

    Alert.alert(
      "Delete Feed:",
      "Are you sure you want to delete?",
      [
        { text: "Cancel", onPress: () => console.log("Cancel Pressed") },
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
    this.db
      .ref("feeds")
      .child(id)
      .remove();

    this.getReaders();
  }

  editReader(id) {
    var self = this;
    console.log("let edit", id);
    var ref = this.db.ref("feeds").child(id);

    console.log(ref);

    ref.on("value", function(snap) {
      var data = snap.val();
      console.log(snap.val());

      //Set the for to have the data
      self.setState({
        newFeedName: data.feedName,
        newFeedUrl: data.feedUrl,
        editId: id,
        editMode: true
      });
    });
  }

  getReaders(kill) {
    console.log("get thems");
    var urls = [],
      self = this;

    // console.log(111);
    //
    // if (kill) {
    //
    //   this.state.posts = []
    //   console.log("killed");
    //   this.setState({
    //     posts: update(this.state.posts, [])
    //   });
    //
    //   this.setState({ refreshing: false });
    //   return;
    // }

    //Get all readers
    this.db.ref("feeds").on("value", feed => {
      feed.forEach(f => {
        var obj = f.val();
        obj.feedHash = f.key;
        urls.push(obj);
      });

      this.state.feedList = [];

      this.setState({
        feedList: urls
      });

      this.state.posts = [];

      urls.forEach(function(url, index) {
        console.log("url to be fetched: " + url);
        self.fetchPosts(url.feedUrl).then(this.parsePosts);
      });

      this.setState({ refreshing: false });
    });
  }

  //fetchPosts = url => axios.get(url);
  fetchPosts = url =>
    fetch(
      "https://api.rss2json.com/v1/api.json?rss_url=" +
        url +
        "&api_key=atojnjecsei7lllnpdzggqav39figqgfvdok48g0&count=50"
    )
      .then(resp => resp.json())
      .then(this.parsePosts);

  parsePosts = response => {
    console.log("parse them all");
    var postList = [];

    if (typeof response !== "undefined" && response.status === "ok") {
      response.items.forEach(item => {
        postList.push({
          title: item.title,
          href: item.link,
          desc: item.description,
          date: moment(item.pubDate).format("MMMM Do YYYY, h:mm a"),
          timestamp: moment(item.pubDate).valueOf(),
          thumb: item.thumbnail,
          articleTitle: response.feed.title
        });
      });
    }

    if (postList.length) {
      console.log(postList);
      var masterList = this.state.posts.concat(postList);

      this.state.posts = [];

      this.setState({
        posts: masterList.sort((a, b) => {
          return b.timestamp - a.timestamp;
        })
      });
    }
  };

  openArticle = url => {
    Linking.openURL(url);
  };

  textChange = stateName => value => {
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
                  <Text style={{ fontWeight: "bold" }}>
                    {item.articleTitle}
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
