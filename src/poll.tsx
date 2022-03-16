import {
  CommandHandler,
  useDescription,
  useNumber,
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
} from "slshx";

// `Env` contains bindings and is declared in types/env.d.ts
export function poll_create(): CommandHandler<Env> {
  useDescription("Sends a poll");

  const question = useString("question", "Poll question or topic", { required: false });
  const attachment = useAttachment("attachment", "Files to attach to the poll", { required: false });

  const [questionId, questionValue] = useInput();
  const [descriptionId, descriptionValue] = useInput();
  const [optionId, optionValue] = useInput();

  const selectId = useSelectMenu((interaction, env, ctx) => {
    // Array of selected values, e.g. ["1", "3"]
    const selected = interaction.data.values;
    return <Message update>Selected: {selected.join(",")}</Message>;
  });

  const modalId = useModal<Env>(async (interaction, env, ctx) => {
    let file: File | undefined;

    if (attachment != null) {
      const attachment_file = await fetch(attachment?.proxy_url);
      const buffer = await attachment_file.arrayBuffer();
      file = new File([buffer], attachment.filename, { type: attachment.content_type });
    }

    return <Message attachments={file ? [file] : undefined}>
      <Embed
        title={question || questionValue}
        color={0xffffff}
        timestamp={new Date()}
        image={attachment?.content_type?.startsWith("image") ? `attachment://${attachment.filename}` : undefined}
        footer="Powered by ratio.yukata.tech"
      >
        {descriptionValue}

        <Select
          id={selectId}
          placeholder="Choose an option"
        >
          {optionValue.split('\n').forEach((option, idx) => {
            <Option value={idx.toString()}>{option}</Option>
          })}
        </Select>
      </Embed>
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
