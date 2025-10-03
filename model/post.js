const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    replies: [
        {
            text: String,
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "user"
            },
            likes: [
                {
                    user: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: "user"
                    },

                    type: {
                        type: String
                    }
                }
            ],

            replay: [
                {
                    text: String,
                    user: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: "user"
                    },
                    likes: [
                        {
                            user: {
                                type: mongoose.Schema.Types.ObjectId,
                                ref: "user"
                            },

                            type: {
                                type: String
                            }
                        }
                    ],
                    replay: [{
                        replayOf: String,
                        text: String,
                        user: {
                            type: mongoose.Schema.Types.ObjectId,
                            ref: "user"
                        },
                        likes: [
                            {
                                user: {
                                    type: mongoose.Schema.Types.ObjectId,
                                    ref: "user"
                                },

                                type: {
                                    type: String
                                }
                            }
                        ]
                    }]
                }
            ]
        }
    ],
    likes: [
        {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "user"
            },

            type: {
                type: String
            }
        }
    ],
});

const postSchema = new mongoose.Schema({
    caption: {
        type: String,
        required: true
    },
    postOwner: {  // Fixed Typo
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },

    isClip: {
        type: Boolean,
        default: false
    },

    media: {
        type: String,
        required: true
    },
    video: {
        type: Boolean,
        default: false
    },
    image: {
        type: Boolean,
        default: false
    },
    comments: [commentSchema],  // Embedded comment schema
    likes: [
        {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "user"
            },

            type: {
                type: String,
            }
        }
    ],

    share: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user"
        }
    }],
    views: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: "user" } }]
});

const Post = mongoose.model("Post", postSchema);
module.exports = Post;
