/**
 * @file Tree-sitter parser for YSH shell script language
 * @author Danilo Spinella <oss@danyspin97.org>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const SPECIAL_CHARACTERS = [
  "'",
  '"',
  "<",
  ">",
  "{",
  "}",
  "\\[",
  "\\]",
  "(",
  ")",
  "`",
  "$",
  "|",
  "&",
  ";",
  "\\",
  "\\s",
];

const PREC = {
  UPDATE: 0,
  ASSIGN: 1,
  TERNARY: 2,
  LOGICAL_OR: 3,
  LOGICAL_AND: 4,
  BITWISE_OR: 5,
  BITWISE_XOR: 6,
  BITWISE_AND: 7,
  EQUALITY: 8,
  COMPARE: 9,
  TEST: 10,
  UNARY: 11,
  SHIFT: 12,
  ADD: 13,
  MULTIPLY: 14,
  EXPONENT: 15,
  NEGATE: 16,
  PREFIX: 17,
  CHAIN: 18,
  POSTFIX: 19,
};

module.exports = grammar({
  name: "ysh",
  inline: ($) => [
    $._statement,
    $._terminator,
  ],
  extras: ($) => [
    / /,
    /\\\r?\n/,
    /\\( |\t|\v|\f)/,
    $.comment,
  ],
  supertypes: ($) => [
    $._statement,
  ],
  reserved: {
    global: (_) => [
      "var",
      "setvar",
      "setglobal",
      "const",
      "for",
      "in",
      "while",
      "if",
      "elif",
      "else",
      "case",
    ],
  },
  rules: {
    program: ($) => optional($._statements),
    _statements: ($) =>
      seq(
        repeat(choice(seq($._statement, choice($._terminator, /\n/)), /\n/)),
        $._statement,
      ),
    _statement: ($) =>
      choice(
        $.variable_declaration,
        $.variable_assignment,
        $.constant_declaration,
        // $.multiline_command_call,
        $.expression_mode,
        $.command_call,
        $.function_definition,
        $.proc_definition,
        $.for_statement,
        $.while_statement,
        $.if_statement,
        $.case_statement,
        $.piped_statement,
      ),
    _expression: ($) =>
      choice(
        $.function_call,
        $._primary,
        $._postfix,
        $.unary_expression,
        $.binary_expression,
        $.null,
        $._paren_expression,
      ),
    piped_statement: ($) => prec.left(seq($._statement, "|", $._statement)),
    function_definition: ($) =>
      seq("func", $.function_name, $.parameter_list, $.func_block),
    proc_definition: ($) =>
      seq("proc", $.function_name, $.proc_parameter_list, $.proc_block),
    rest_of_arguments: ($) => seq("...", $.variable_name),
    parameter_list: ($) =>
      seq(
        "(",
        rest_of_arguments($, $.function_parameter),
        optional(seq(
          ";",
          rest_of_arguments($, $.named_parameter),
        )),
        ")",
      ),
    proc_parameter_list: ($) =>
      seq(
        "(",
        rest_of_arguments($, $.function_parameter),
        optional(
          seq(
            ";",
            rest_of_arguments($, $.function_parameter),
            optional(seq(
              ";",
              rest_of_arguments($, $.named_parameter),
              optional(seq(";", optional($.function_parameter))),
            )),
          ),
        ),
        ")",
      ),
    parameter_list_call: ($) =>
      seq(
        "(",
        rest_of_arguments($, $._expression),
        optional(seq(
          ";",
          rest_of_arguments($, $.named_parameter),
        )),
        ")",
      ),
    block: ($) =>
      seq(
        "{",
        repeat(choice("\n", "\\{", "\\}")),
        $._statement,
        repeat(
          choice(
            "\\{",
            "\\}",
            "\n",
            seq(choice($._terminator, "\n"), $._statement),
          ),
        ),
        "}",
      ),
    func_block: ($) =>
      seq(
        "{",
        repeat(choice("\n", "\\{", "\\}")),
        choice($._statement, $.func_return),
        repeat(
          choice(
            "\\{",
            "\\}",
            "\n",
            seq(
              choice($._terminator, "\n"),
              choice($._statement, $.func_return),
            ),
          ),
        ),
        "}",
      ),
    func_return: ($) => seq("return", $._paren_expression),
    proc_block: ($) =>
      seq(
        "{",
        repeat(choice("\n", "\\{", "\\}")),
        choice($._statement, $.proc_return),
        repeat(
          choice(
            "\\{",
            "\\}",
            "\n",
            seq(
              choice($._terminator, "\n"),
              choice($._statement, $.proc_return),
            ),
          ),
        ),
        "}",
      ),
    proc_return: ($) => seq("return", $._literal),
    variable_declaration: ($) =>
      seq(
        "var",
        field("variable", $.variable_name),
        "=",
        field("value", $._expression),
      ),
    variable_assignment: ($) =>
      seq(
        choice("setvar", "setglobal"),
        field("variable", $.variable_name),
        optional($._variable_access),
        choice("=", "+="),
        field("value", $._expression),
      ),
    constant_declaration: ($) =>
      seq(
        "const",
        field("constant", $.variable_name),
        "=",
        $._expression,
      ),
    command_call: ($) =>
      prec.left(seq(
        optional("!"),
        $.command_name,
        repeat(
          choice(
            $._literal,
            $.redirection,
            $.word,
          ),
        ),
        optional(seq($.parameter_list_call, repeat($.redirection))),
        optional(seq($.block, repeat($.redirection))),
      )),
    multiline_command_call: ($) =>
      seq(
        "...",
        $.command_name,
        repeat(seq(choice($.command_line, $.comment), "\n")),
        optional($.command_line),
      ),
    command_line: ($) => seq(repeat1(choice($._literal, $.word))),
    dollar_token: (_) => "$",
    for_statement: ($) =>
      seq(
        "for",
        $.variable_name,
        repeat(
          seq(
            ",",
            $.variable_name,
          ),
        ),
        "in",
        $._for_clause,
        $.block,
      ),
    _for_clause: ($) =>
      choice(
        $._for_range,
        $._paren_expression,
        prec.left(field(
          "value",
          repeat1(choice(
            $._literal,
            $.word,
          )),
        )),
      ),
    _for_range: ($) =>
      seq("(", $._expression, $.range_operator, $._expression, ")"),
    _control_flow_condition: ($) => choice($._paren_expression, $.command_call),
    while_statement: ($) =>
      prec.right(seq("while", $._control_flow_condition, $.block)),
    if_statement: ($) =>
      seq(
        "if",
        $._control_flow_condition,
        $.block,
        repeat(seq("elif", $._control_flow_condition, $.block)),
        optional(seq("else", $.block)),
      ),
    case_statement: ($) =>
      prec.right(seq(
        "case",
        $._paren_expression,
        "{",
        repeat(choice("\n", $.case_condition)),
        "}",
      )),
    case_condition: ($) =>
      seq(
        choice($.glob, $._paren_expression, $.eggex, seq("(", "else", ")")),
        repeat("\n"),
        $.block,
      ),
    _paren_expression: ($) =>
      seq(
        "(",
        $._expression,
        ")",
      ),
    return_statement: ($) =>
      seq(
        "return",
        $._paren_expression,
      ),
    _variable_access: ($) =>
      seq(
        choice(
          seq(
            ".",
            field("member", $.variable_name),
          ),
          prec.left(seq(
            "[",
            field("key", $._expression),
            "]",
          )),
        ),
      ),
    expression_mode: ($) =>
      prec.left(seq(
        choice("call", "="),
        $._expression,
      )),
    function_call: ($) =>
      prec.left(seq(
        seq(
          field("call", $.function_name),
          "(",
          commaSep($._expression),
          optional(seq(choice(",", ";"), commaSep($.named_parameter))),
          ")",
        ),
      )),
    dict: ($) =>
      seq(
        "{",
        commaSep(seq(
          choice(
            field("key", $.variable_name),
            seq("[", field("key", $._expression), "]"),
          ),
          ":",
          $._expression,
        )),
        "}",
      ),
    list: ($) => seq("[", commaSep($._expression), "]"),
    literal_list: ($) => seq(":|", repeat($.word), "|"),
    named_parameter: ($) =>
      seq(
        $.function_parameter,
        repeat("\n"),
        "=",
        repeat("\n"),
        $._expression,
      ),
    _postfix: ($) =>
      prec.left(
        PREC.POSTFIX,
        seq(
          $._expression,
          repeat1(choice(
            $._variable_access,
            $.method_call,
          )),
        ),
      ),
    _primary: ($) =>
      prec.right(
        20,
        choice(
          $.number,
          $.boolean,
          $.string,
          $.list,
          $.dict,
          $.eggex,
          $.escaped_newline_value,
          $.literal_list,
          $.variable_name,
          $.escaped_double_quote,
          $.escaped_single_quote,
        ),
      ),
    _literal: ($) => choice($.number, $.boolean, $.string, $.expansion),
    string: ($) =>
      choice(
        $._double_quotes_string,
        $._single_quotes_string,
        $._raw_string,
        $._j8_string,
        $._byte_string,
      ),
    method_call: ($) =>
      seq(
        choice(".", "->"),
        field("method", $.function_name),
        "(",
        commaSep($._expression),
        ")",
      ),
    expansion: ($) =>
      choice(
        seq(
          "$",
          field("variable", /[0-9\?\#\*]/),
        ),
        seq(
          "$",
          field("variable", $.variable_name),
        ),
        seq(
          "${",
          field("variable", $.variable_name),
          optional(seq(":-", $._literal)),
          "}",
        ),
        seq(
          "@",
          $.variable_name,
        ),
        seq(
          choice("$", "@", "^"),
          "[",
          $._expression,
          "]",
        ),
        seq(
          choice("$", "@", "^"),
          "(",
          $.command_call,
          ")",
        ),
      ),
    binary_expression: ($) => {
      const table = [
        ["or", PREC.LOGICAL_OR],
        ["and", PREC.LOGICAL_AND],
        ["|", PREC.BITWISE_OR],
        ["^", PREC.BITWISE_XOR],
        ["&", PREC.BITWISE_AND],
        [choice("==", "!=", "!==", "===", "~=="), PREC.EQUALITY],
        [choice("<", ">", "<=", ">=", "~", "!~", "~~", "!~~"), PREC.COMPARE],
        [choice("<<", ">>"), PREC.SHIFT],
        [choice("+", "-", "++"), PREC.ADD],
        [choice("*", "/", "%"), PREC.MULTIPLY],
        ["**", PREC.EXPONENT],
        ["=>", PREC.CHAIN],
      ];

      return choice(...table.map(([operator, precedence]) => {
        // @ts-ignore
        return prec.left(
          precedence,
          seq(
            field("left", $._expression),
            // @ts-ignore
            field("operator", operator),
            field("right", $._expression),
          ),
        );
      }));
    },
    unary_expression: ($) =>
      seq(
        choice("not", "&", "+"),
        $._expression,
      ),
    redirection: ($) =>
      prec(
        20,
        seq(
          optional(alias($._decimal, $.number)),
          choice(
            "<",
            "<>",
            ">&",
            "&>",
            ">",
            ">|",
            ">>",
            "&>>",
            ">>&",
            "<<<",
          ),
          choice($.word, $._literal),
        ),
      ),
    _double_quotes_string: ($) =>
      seq(
        optional("$"),
        choice(
          seq(
            '"',
            repeat($._double_quotes_string_content),
            '"',
          ),
          seq(
            '"""',
            repeat($._double_quotes_string_content),
            '"""',
          ),
        ),
      ),
    _double_quotes_string_content: ($) =>
      choice(
        /[^\$\\"]+/,
        $.escape_special_characters,
        $.escaped_double_quote,
        $.escaped_newline,
        $.expansion,
      ),
    _j8_string: ($) =>
      choice(
        seq(
          "u'",
          repeat(choice(
            /[^\\']+/,
            $.escape_sequence,
          )),
          "'",
        ),
        seq(
          "u'''",
          repeat(choice(
            /[^\\']+/,
            $.escape_sequence,
            "'",
          )),
          "'''",
        ),
      ),
    _byte_string: ($) =>
      choice(
        seq(
          "b'",
          repeat(choice(
            /[^\\']+/,
            $.escape_sequence,
            $.escaped_bytes,
          )),
          "'",
        ),
        seq(
          "b'''",
          repeat(choice(
            /[^\\']+/,
            $.escape_sequence,
            $.escaped_bytes,
            "'",
          )),
          "'''",
        ),
      ),
    _single_quotes_string: (_) => choice(/'[^'\\]*'/, /'''[^'\\]*'''/),
    _raw_string: (_) => choice(/r'[^']*'/, /r'''[^']*'''/),
    escaped_double_quote: (_) => '\\"',
    escaped_single_quote: (_) => "\\'",
    escaped_newline: (_) => "\\\n",
    escaped_newline_value: (_) => "\\n",
    escape_special_characters: (_) =>
      token.immediate(seq("\\", choice("\\", "$"))),
    function_name: ($) => $.variable_name,
    function_parameter: ($) => $.variable_name,
    constant: ($) => $.variable_name,
    glob: ($) => seq($.word, repeat(seq("|", $.word))),
    eggex: (_) => seq("/", /[^/]*/, "/"),
    variable_name: (_) => /[_a-zA-Z]\w*/,
    command_name: (_) => /[a-zA-Z0-9_][a-zA-Z0-9\.-_]*/,
    positional_argument: (_) => /[1-9][0-9]?/,
    number: ($) =>
      choice(
        $._decimal,
        // Hex
        /0x[a-fA-F0-9]+(?:(?:_[a-fA-F0-9]+)*)?/,
        // Oct
        /0o[0-7]+(?:(?:_[0-7]+)*)?/,
        // Binary
        /0b[01]+(?:(?:_[01]+)*)?/,
      ),
    _decimal: (_) => /\d+(?:(:?_\d+)*)?/,
    escaped_bytes: (_) => /\\y[a-fA-F0-9]{2}/,
    escape_sequence: (_) =>
      choice(
        /\\[\"\'\\\/bfnrt]/,
        /\\u\{[0-9a-fA-F]{2,5}\}/,
      ),
    null: (_) => "null",
    boolean: (_) => choice("true", "false"),
    range_operator: (_) => "..<",
    comment: (_) => token(prec(-10, /#.*/)),
    word: (_) =>
      token(seq(
        choice(
          noneOf("#", ...SPECIAL_CHARACTERS),
          seq("\\", noneOf("\\s")),
        ),
        repeat(choice(
          noneOf(...SPECIAL_CHARACTERS),
          seq("\\", noneOf("\\s")),
          "\\ ",
        )),
      )),
    _terminator: (_) => choice(";", ";;", "&"),
  },
});

/**
 * Returns a regular expression that matches any character except the ones
 * provided.
 *
 * @param  {...string} characters
 *
 * @returns {RegExp}
 */
function noneOf(...characters) {
  const negatedString = characters.map((c) => c == "\\" ? "\\\\" : c).join("");
  return new RegExp("[^" + negatedString + "]");
}

/**
 * Creates a rule to optionally match one or more of the rules separated by a comma
 *
 * @param {RuleOrLiteral} rule
 *
 * @returns {ChoiceRule}
 */
function commaSep(rule) {
  return optional(commaSep1(rule));
}

/**
 * Creates a rule to match one or more of the rules separated by a comma
 * Allows newline anywhere
 *
 * @param {RuleOrLiteral} rule
 *
 * @returns {SeqRule}
 */
function commaSep1(rule) {
  return seq(
    repeat("\n"),
    rule,
    repeat(seq(repeat("\n"), ",", repeat("\n"), rule)),
    repeat("\n"),
  );
}

/**
 * Turns a list of rules into a choice of aliased token rules
 *
 * @param {number} precedence
 *
 * @param {(RegExp | string)[]} literals
 *
 * @returns {ChoiceRule}
 */
function tokenLiterals(precedence, ...literals) {
  return choice(...literals.map((l) => token(prec(precedence, l))));
}

/**
 * @param {RuleOrLiteral} rule
 *
 * @returns {ChoiceRule}
 */
function rest_of_arguments(self, rule) {
  return choice(
    seq(commaSep1(rule), optional(seq(",", self.rest_of_arguments))),
    optional(self.rest_of_arguments),
  );
}
