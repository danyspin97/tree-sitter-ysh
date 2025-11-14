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
    /( |\t)+/,
    /\\\r?\n/,
    /\\( |\t|\v|\f)/,
    $.comment,
    $._newline,
    $.escaped_newline,
  ],
  externals: ($) => [
    $.dollar_expansion,
    $.hat_expansion,
    $.environment_variable_name,
    $.environment_equals,
    $.const_declaration_variable,
    $.comma,
    $.semicolon,
    $.close_paren,
    $.close_brace,
    $.close_bracket,
    $.closing_list,
    $.named_parameter_equals,
    $._newline,
    $._terminator_sentinel,
    $._statement_sentinel,
    $._multiline_command_sentinel,
    $._comma_sentinel,
    $.error_sentinel,
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
  conflicts: ($) => [
    [$.parameter_list_call],
    [$._statements, $._statement_terminator]
  ],
  rules: {
    program: ($) => optional($._statements),
    _statements: ($) => seq(
      repeat(choice($._terminated_statement)),
      $._statement,
      prec(-1, repeat("\n")),
    ),
    _statement: ($) =>
      choice(
        $.multiline_command_call,
        seq($._single_line_statement, optional($._statement_terminator)),
        $._statement_sentinel,
      ),
    _terminated_statement: ($) =>
      prec.right(
        10,
        choice(
          seq($._single_line_statement, $._statement_terminator),
          $.multiline_command_call,
          $._statement_sentinel,
        ),
      ),
    _single_line_statement: ($) =>
      choice(
        $.variable_declaration,
        $.variable_assignment,
        $.expression_mode,
        $.command_call,
        $.function_definition,
        $.proc_definition,
        $.for_statement,
        $.while_statement,
        $.if_statement,
        $.case_statement,
        $.const_declaration,
      ),
    _expression: ($) =>
      choice(
        $.function_call,
        $._primary,
        $._postfix,
        $.unary_expression,
        $.binary_expression,
        $._paren_expression,
        $.expansion,
      ),
    function_definition: ($) =>
      seq("func", $.function_name, $.parameter_list, $.func_block),
    proc_definition: ($) =>
      seq(
        "proc",
        $.proc_name,
        optional($.proc_parameter_list),
        $.proc_block,
      ),
    rest_of_arguments: ($) => seq("...", $.variable_name),
    parameter_list: ($) =>
      seq(
        "(",
        rest_of_arguments($, $.function_parameter),
        optional(seq(
          alias($.semicolon, ";"),
          rest_of_arguments($, $.named_parameter),
        )),
        alias($.close_paren, ")"),
      ),
    proc_parameter_list: ($) =>
      seq(
        "(",
        rest_of_arguments($, $.function_parameter),
        optional(
          seq(
            alias($.semicolon, ";"),
            rest_of_arguments($, $.function_parameter),
            optional(seq(
              alias($.semicolon, ";"),
              choice(
                rest_of_arguments($, $.named_parameter),
                rest_of_arguments($, $.function_parameter),
              ),
              optional(seq(alias($.semicolon, ";"), optional($.function_parameter))),
            )),
          ),
        ),
        alias($.close_paren, ")"),
      ),
    parameter_list_call: ($) =>
      seq(
        "(",
        choice(
          seq(
            rest_of_arguments($, $._expression),
            alias($.semicolon, ";"),
            rest_of_arguments($, $.named_parameter),
          ),
          rest_of_arguments($, choice($.named_parameter, $._expression)),
        ),
        optional(alias($.comma, ",")),
        alias($.close_paren, ")"),
      ),
    block: ($) =>
      seq(
        "{",
        repeat($._terminated_statement),
        $._statement,
        alias($.close_brace, "}"),
      ),
    func_block: ($) => seq(
      "{",
      repeat(seq(choice($._statement, $.func_return), $._statement_terminator)),
      choice($._statement, $.func_return),
      optional($._statement_terminator),
      alias($.close_brace, "}"),
    ),
    func_return: ($) => prec(20, seq("return", $._paren_expression)),
    proc_block: ($) => seq(
      "{",
      repeat(seq(choice($._statement, $.proc_return), $._statement_terminator)),
      choice($._statement, $.proc_return),
      optional($._statement_terminator),
      alias($.close_brace, "}"),
    ),
    proc_return: ($) => seq("return", $._literal),
    variable_declaration: ($) =>
      prec.left(
        -10,
        seq(
          choice(
            seq("var", field("variable", $.variable_name)),
            seq("const", field("constant", $.variable_name)),
          ),
          "=",
          field("value", $._expression),
        ),
      ),
    const_declaration: ($) =>
      prec.left(
        -20,
        seq(
          field("constant", alias($.const_declaration_variable, $.variable_name)),
          '=',
          field("value", $._expression),
        ),
      ),
    variable_assignment: ($) =>
      seq(
        choice("setvar", "setglobal"),
        field("variable", $.variable_name),
        optional($._variable_access),
        choice("=", "+=", "-=", "*=", "/="),
        field("value", $._expression),
      ),
    command_call: ($) =>
      prec.left(seq(
        optional("!"),
        repeat($.environment),
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
        optional(prec.right(
          -2,
          seq(
            choice("|", "&&", "||"),
            $._single_line_statement,
          ),
        )),
      )),
    multiline_command_call: ($) =>
      prec.right(seq(
        "...",
        $.command_name,
        repeat(
          choice(
            prec.left(20, seq(choice("|", "&&", "||"), $.command_name)),
            $._command_line,
          ),
        ),
        choice($._multiline_command_sentinel, $._terminator),
      )),
    _command_line: ($) =>
      prec.right(seq(repeat1(field("argument", choice($._literal, $.word))))),
    for_statement: ($) =>
      seq(
        "for",
        $.variable_name,
        repeat(
          seq(
            alias($.comma, ","),
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
        repeat($.case_condition),
        alias($.close_brace, "}")
      )),
    case_condition: ($) =>
      seq(
        choice($.glob, $._paren_expression, $.eggex, seq("(", "else", ")")),
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
          commaSep($, $._expression),
          optional(
            choice(
              seq(
                choice(alias($.comma, ","), alias($.semicolon, ";")),
                commaSepWithTrailing($, $.named_parameter)
              ),
              alias($.comma, ",")
            ),
          ),
          alias($.close_paren, ")"),
        ),
      )),
    dict: ($) =>
      seq(
        "{",
        commaSepWithTrailing(
          $,
          seq(
            choice(
              field("key", $.variable_name),
              field("key", $.string),
              seq("[", field("key", $._expression), "]"),
            ),
            ":",
            $._expression,
          ),
        ),
        alias($.close_brace, "}"),
      ),
    list: ($) => seq("[", commaSepWithTrailing($, $._expression), alias($.close_bracket, "]")),
    literal_list: ($) => seq(":|", repeat($.word), alias($.closing_list, "|")),
    named_parameter: ($) =>
      seq(
        $.function_parameter,
        alias($.named_parameter_equals, "="),
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
    environment: ($) =>
      seq(
        alias($.environment_variable_name, $.variable_name),
        choice(
          seq(alias($.environment_equals, "="), choice($.word, $._literal)),
          "=",
        ),
      ),
    _primary: ($) =>
      prec.right(
        20,
        choice(
          $.number,
          $.boolean,
          $.null,
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
        commaSepWithTrailing($, $._expression),
        alias($.close_paren, ")"),
      ),
    expansion: ($) =>
      choice(
        seq(
          alias($.dollar_expansion, "$"),
          choice($.variable_name, alias(/[0-9\*\?\#\@]/, $.variable_name)),
        ),
        seq(
          alias($.dollar_expansion, "$"),
          "{",
          choice($.variable_name, alias(/[0-9\*\?\#\@]/, $.variable_name)),
          optional(seq(":-", $._literal)),
          "}",
        ),
        seq(
          alias($.hat_expansion, "@"),
          $.variable_name,
        ),
        seq(
          choice(
            alias($.dollar_expansion, "$"),
            alias($.hat_expansion, "@"),
            "^",
          ),
          "[",
          $._expression,
          "]",
        ),
        seq(
          choice(
            alias($.dollar_expansion, "$"),
            alias($.hat_expansion, "@"),
            "^",
          ),
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
        [choice(seq("is", optional("not")), "==", "!=", "!==", "===", "~=="), PREC.EQUALITY],
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
          field("redirection_value", choice($.word, $._literal)),
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
            repeat(choice('"', $._double_quotes_string_content)),
            '"""',
          ),
        ),
      ),
    _double_quotes_string_content: ($) =>
      choice(
        /[^\$\\"]+/,
        $.escape_special_characters,
        $.escaped_double_quote,
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
          seq(choice("$", "b"), "'"),
          repeat(choice(
            /[^\\']+/,
            $.escape_sequence,
            $.escaped_bytes,
          )),
          "'",
        ),
        seq(
          seq(choice("$", "b"), "'''"),
          repeat(choice(
            /[^\\']+/,
            $.escape_sequence,
            $.escaped_bytes,
            "'",
          )),
          "'''",
        ),
      ),
    _single_quotes_string: (_) => choice(/'[^'\\]*'/, /'''[^\\]*'''/),
    _raw_string: (_) => choice(/r'[^']*'/, /r'''[^']*'''/),
    escaped_double_quote: (_) => '\\"',
    escaped_single_quote: (_) => "\\'",
    escaped_newline: (_) => "\\\n",
    escaped_newline_value: (_) => "\\n",
    escape_special_characters: (_) =>
      token.immediate(seq("\\", choice("\\", "$"))),
    function_name: ($) => $.variable_name,
    proc_name: (_) => token(/[-_a-zA-Z0-9]+/),
    function_parameter: ($) => $.variable_name,
    glob: ($) => seq($.word, repeat(seq("|", $.word))),
    eggex: ($) => seq("/", repeat(choice($._literal, prec(-20, /[^"'/]+/))), "/"),
    variable_name: (_) => token(/[_a-zA-Z]\w*/),
    // Do not use literal as a nubmer and a boolean should be parsed as words
    command_name: ($) => choice($.word, $.expansion, $.string),
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
    _decimal: (_) => /\d+(_\d+)*(\.\d+)?(_\d+)*/,
    escaped_bytes: (_) => /\\y[a-fA-F0-9]{2}/,
    escape_sequence: (_) =>
      choice(
        /\\["'\\/bfnrt]/,
        /\\u\{[0-9a-fA-F]{2,5}\}/,
      ),
    null: (_) => "null",
    boolean: (_) => choice("true", "false"),
    range_operator: (_) => "..<",
    comment: (_) => token(prec(-10, /#.*/)),
    word: (_) =>
      token(seq(
        choice(
          noneOf("#", "@", ...SPECIAL_CHARACTERS),
          seq("\\", noneOf("\\s")),
        ),
        repeat(choice(
          noneOf(...SPECIAL_CHARACTERS),
          seq("\\", noneOf("\\s")),
          "\\ ",
        )),
      )),
    _statement_terminator: ($) => choice($._terminator, "\n", $._terminator_sentinel),
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
function commaSep(self, rule) {
  return optional(commaSep1(self, rule));
}

/**
 * Same as `commaSep` but allows a trailing comma
 *
 * @param {RuleOrLiteral} rule
 *
 * @returns {SeqRule}
 */
function commaSepWithTrailing(self, rule) {
  return seq(commaSep(self, rule), optional(alias(self.comma, ",")));
}

/**
 * Creates a rule to match one or more of the rules separated by a comma
 * Allows newline anywhere
 *
 * @param {RuleOrLiteral} rule
 *
 * @returns {SeqRule}
 */
function commaSep1(self, rule) {
  return seq(
    optional(self._comma_sentinel), rule,
    repeat(seq(alias(self.comma, ","),
    optional(self._comma_sentinel), rule)));
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
    seq(
      commaSep(self, rule),
      optional(seq(
        alias(self.comma, ","),
        self.rest_of_arguments))),
    optional(self.rest_of_arguments),
  );
}
