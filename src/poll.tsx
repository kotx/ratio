import converter, { EmojiError } from "discord-emoji-converter/dist/discord-emoji-converter.min.js";
// import { emojiToName, nameToEmoji } from "gemoji";
import {
  CommandHandler,
  useDescription,
  createElement,
  Message,
  useString,
  useAttachment,
  Modal,
  useModal,
  useInput,
  Input,
  Embed,
  Select,
  useSelectMenu,
  Option,
  Row,
  useButton,
  Button,
  getOriginalInteractionResponse,
  deleteOriginalInteractionResponse,
} from "slshx";

class Poll {
  owner!: string;
  question!: string;
  description?: string;
  options!: PollOption[];
  closed: boolean = true;
  votes: Record<string, number> = {};
}

class PollOption {
  emoji?: string;
  name!: string;
  description?: string;
}

// `Env` contains bindings and is declared in types/env.d.ts
export function poll_create(): CommandHandler<Env> {
  useDescription("Sends a poll");

  const question = useString("question", "Poll question or topic", { required: false });
  const attachment = useAttachment("attachment", "Files to attach to the poll", { required: false });

  const [questionId, questionValue] = useInput();
  const [descriptionId, descriptionValue] = useInput();
  const [optionId, optionValue] = useInput();

  const selectId = useSelectMenu(async (interaction, env: Env, ctx) => {
    const poll_value = await env.KV_NAMESPACE.get(interaction.message.id);
    let poll: Poll = JSON.parse(poll_value!);

    const selected_idx = Number.parseInt(interaction.data.values[0]);
    poll.votes[interaction.member!.user.id] = selected_idx;
    await env.KV_NAMESPACE.put(interaction.message.id, selected_idx.toString());

    return <Message ephemeral>You selected: {poll.options[selected_idx]}</Message>;
  });

  const closeButtonId = useButton(async (interaction, env: Env, ctx) => {
    const poll_value = await env.KV_NAMESPACE.get(interaction.message.id);
    let poll: Poll = JSON.parse(poll_value!);
    if (poll.owner === interaction.member?.user.id) {
      poll.closed = true;

      return <Message>The poll has been closed.
        <Embed title={`Results for ${poll.question}`}>
          TODO
        </Embed>
      </Message>;
    } else {
      return <Message ephemeral>You don't have permission to close this poll.</Message>
    }
  });

  const modalId = useModal<Env>(async (interaction, env, ctx) => {
    const optionRegex = new RegExp(/(?:(?::)(\w+)(?::) )?(.+)/g);
    const options: PollOption[] = Array.from(optionValue.matchAll(optionRegex))
      .map(match => { return { emoji: match[1], name: match[2] } });

    if (options == null || options.length == 0) {
      return <Message>
        Your given poll options were invalid!{"\n"}
        Try using this syntax:
        ```text{"\n"}
        :smile: Happy{"\n"}
        :sob: Sad
        Neither
        ```{"\n"}
        For technical users, our [RegEx](https://en.wikipedia.org/wiki/Regular_expression) is the following:{"\n"}
        ```regex{"\n"}
        {optionRegex.source}
        ```
      </Message>
    }

    let file: File | undefined;
    if (attachment != null) {
      const attachment_file = await fetch(attachment?.proxy_url);
      const buffer = await attachment_file.arrayBuffer();
      file = new File([buffer], attachment.filename, { type: attachment.content_type });
    }

    const poll: Poll = {
      question: question || questionValue,
      description: descriptionValue,
      owner: interaction.member!.user.id,
      closed: false,
      options,
      votes: {}
    };

    await env.KV_NAMESPACE.put(orig.id, JSON.stringify(poll));

    return <Message attachments={file ? [file] : undefined}>
      <Embed
        title={poll.question}
        color={0xffffff}
        timestamp={new Date()}
        image={attachment?.content_type?.startsWith("image") ? `attachment://${attachment.filename}` : undefined}
      >
        {poll.description}
      </Embed>

      <Select
        id={selectId}
        placeholder="Choose an option"
      >
        {poll.options.map((option, idx) => {
          let emoji;
          try {
            emoji = converter.getEmoji(option.emoji || "");
          } catch (EmojiError) {
            emoji = null;
          }
          // const emoji: string | undefined = nameToEmoji[option.emoji || ""];
          return <Option value={idx.toString()} emoji={emoji}>{option.name}</Option>
        })}
      </Select>

      <Row>
        <Button id={closeButtonId} emoji="🚧">Close poll</Button>
      </Row>
    </Message>;
  });

  return () => {
    return (
      <Modal id={modalId} title="Make a poll">
        <Input
          id={questionId}
          label="Question"
          placeholder="Your poll's question or topic"
          minLength={1}
          required
          value={question || undefined}
        />
        <Input
          id={descriptionId}
          label="Description"
          placeholder="Your poll's description"
          maxLength={3000}
          paragraph
        />
        <Input
          id={optionId}
          label="Poll options"
          placeholder="Your poll's options, line-separated"
          minLength={1}
          maxLength={3000}
          paragraph
          required
        />
      </Modal>
    );
  }
}
