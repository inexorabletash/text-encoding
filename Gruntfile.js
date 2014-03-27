module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    browserify: {
      standalone: {
        src: [ 'lib/encoding.js' ],
        dest: 'dist/<%= pkg.name %>.js',
        options: {
          standalone: '<%= pkg.name %>'
        }
      }
    },

    uglify: {
      main: {
        files: {
          'dist/<%= pkg.name %>.min.js' : [ 'dist/<%= pkg.name %>.js' ]
        }
      },
      options: {
        banner: '/*! <%= pkg.name %> v<%= pkg.version %> */'
      }
    },

    clean: ['dist/']
  });

  // Load the plugin(s)
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-uglify');

  grunt.registerTask('default', ['clean', 'browserify', 'uglify']);

};
