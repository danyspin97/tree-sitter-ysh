/**
 * @file Tree-sitter parser for YSH shell script language
 * @author Danilo Spinella <oss@danyspin97.org>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const PREC = {
  COMMENT: 0,
}

module.exports = grammar({
  name: "ysh",

  extras: $ => [
    / /,
    $.comment
  ],

  rules: {
    source_file: $ => repeat($._definition),

    _definition: $ => choice(
      $.function_definition,
      $._statement
    ),

    function_definition: $ => seq(
      'func',
      $.function_identifier,
      $.parameter_list,
      $.block
    ),

    function_identifier: $ => $.identifier,

    function_parameter: $ => $.identifier,

    parameter_list: $ => seq(
      $.left_paren,
        optional(
          seq(
            $.function_parameter,
            optional(
              repeat1(
                seq(
                  $.comma,
                  $.function_parameter
                )
              )
            )
          )
        ),
        optional(
          seq(
            ';',
            $.named_parameter,
            optional(
              repeat1(
                seq(
                  $.comma,
                  $.named_parameter
                )
              )
            )
          )
        ),
      $.right_paren
    ),

    block: $ => seq(
      $.left_bracket,
      repeat($._statement),
      $.right_bracket
    ),

    left_bracket: $ => '{',
    right_bracket: $ => '}',

    _statement: $ => choice(
      $._declaration,
      $.function_call_shell,
      $.for_statement,
    ),

    _declaration: $ => seq(
      choice(
        seq(
          choice(
            'var',
            'setvar',
          ),
          $.variable,
        ),
        seq(
          'const',
          $.constant
        ),
      ),
      $.equal_sign,
      $.expression,
      '\n'
    ),

    function_call_shell: $ => seq(
      $.function_name,
      repeat(
        $.function_call_parameter,
      ),
      '\n'
    ),

    function_name: $ => $.identifier,

    function_call_parameter: $ => choice(
      $.dollar_variable,
      $.paren_expression,
      $.value,
      $.non_quoted_string,
    ),

    dollar_variable: $ => seq(
      $.dollar_token,
      choice(
        $.variable,
        seq(
          '{',
          $.variable,
          '}'
        ),
      )
    ),

    dollar_token: $ => '$',

    for_statement: $ => seq(
      'for',
      $.identifier,
      optional(
        repeat1(
          seq(
            $.comma,
            $.identifier
          )
        )
      ),
      'in',
      $.for_clause,
      $.block
    ),

    for_clause: $ => choice(
      $.for_range,
      $.paren_expression,
      $.glob
    ),

    for_range: $ => seq(
      $.left_paren,
      choice(
        $.number,
        $.variable,
      ),
      $.range_operator,
      choice(
        $.number,
        $.variable,
      ),
      $.right_paren
    ),

    range_operator: $ => '..<',

    paren_expression: $ => seq(
      $.left_paren,
      $.expression,
      $.right_paren
    ),

    left_paren: $ => '(',
    right_paren: $ =>')',

    return_statement: $ => seq(
      'return',
      $.paren_expression
    ),

    expression: $ => choice(
      $.function_call,
      $.value,
    ),

    function_call: $ => seq(
      seq(
        $.identifier,
        $.left_paren,
        optional(
          choice(
            seq(
              choice(
                $.function_parameter,
                $.value,
              ),
              repeat(seq(
                $.comma,
                choice(
                  $.function_parameter,
                  $.value,
                )
              ))
            ),
            $.subshell
          ),
        ),
        $.right_paren
      ),
    ),

    subshell: $ => seq(
      $.dollar_token,
      $.left_paren,
      $.function_call_shell,
      $.right_paren
    ),

    empty_array: $ => '[]',
    empty_dict: $ => '{}',

    glob: $ => seq(
      repeat1(/\w+/)
    ),

    named_parameter: $ => seq(
      $.function_parameter,
      optional(
        seq(
          $.equal_sign,
          $.value
        )
      )
    ),

    equal_sign: $ => '=',

    identifier: $ => new RustRegex('(?i)[a-z_][a-z0-9_]*'),

    constant: $ => $.identifier,
    variable: $ => choice(
      $.identifier,
      $.positional_argument
    ),

    positional_argument: $ => /[1-9][0-9]?/,

    number: $ => /\d+/,

    value: $ => choice(
      $.number,
      $.string,
      $.boolean,
      $.null,
      $.empty_array,
      $.empty_dict,
    ),

    string: $ => choice(
      seq(
        '"',
        repeat(choice(
          token.immediate(prec(1, /[^"\n\\]+/)),
          $.escape_sequence
        )),
        '"'
      ),
      seq(
        "'",
        repeat(choice(
          token.immediate(prec(1, /[^'\n\\]+/)),
          $.escape_sequence
        )),
        "'"
      )
    ),

    non_quoted_string: $ => choice(
      $.chars,
      $.path,
    ),

    chars: $ => new RustRegex('[^ ]+\n'),

    path: $ => new RustRegex('(/[^/ ]*)+'),

    escape_sequence: $ => token.immediate(seq(
      '\\',
      /[^xuU]/,
    )),

    null: $ => 'null',

    boolean: $ => choice(
      'true',
      'false'
    ),

    comment: $ => token(prec(PREC.COMMENT, seq("#", /[^\n]*/))),

    comma: $ => ',',

    newline: $ => '\n',
  }
});
